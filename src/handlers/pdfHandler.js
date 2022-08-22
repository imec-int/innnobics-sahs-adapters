const R = require('ramda');

const pdfJs = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const logger = require('../tools/logger');
const { findTextBlockIndex, findFirstFourNumbers, findNextDuration } = require('./pdf');
const { determineLanguage, getDictionary } = require('./languages');

const emptySpaceEntry = (item) => item.width === 0 && item.height === 0;

const take = (index) => (arr) => (index < 0 || index >= arr.length ? undefined : arr[index]);

const takeStr = (index) => (arr) => R.prop('str', take(index)(arr));

function toDuration(str) {
  return str ? str.padStart(5, '0') : str;
}

const mapDuration = R.curry((extractStringFn, items) => {
  const str = extractStringFn(items);
  return toDuration(str);
});

const trimEnd = R.curry((char, str) => {
  if (str && str.endsWith(char)) {
    return trimEnd(char, R.dropLast(1, str)); // recursively remove multiple char at the end
  }
  return str;
});

const findIndex = findTextBlockIndex;

const concatUntil = (fn, index) => R.pipe(
  R.drop(index),
  R.takeWhile(R.complement(fn)),
  R.map(R.prop('str')),
  R.join(' '),
);

const concatUntilText = R.curry((limitText, index) => concatUntil((item) => R.trim(item.str).startsWith(limitText), index));

const takeSecondPartOfString = (index) => (arr) => R.pipe(
  take(index),
  R.propOr('', 'str'),
  R.split(':'),
  R.nth(1),
  R.defaultTo(''), // in case nothing is found, use a blank string
  R.trim,
)(arr);

const takeTitledFieldValue = R.curry((title, items) => {
  const strPropStartsWith = R.pipe(R.prop('str'), R.toLower(), R.startsWith(`${R.toLower(title)}:`));

  const index = R.findIndex(strPropStartsWith, items);
  return takeSecondPartOfString(index)(items);
});

const template = (code, name, valueFn) => (items) => ({
  code,
  name,
  value: valueFn(items),
});

const extractHorizontalFields = (blockLabel, nextBlockLabel) => (items) => {
  const blockLabelItem = items.find((item) => item.str.startsWith(blockLabel));
  const nextBlockLabelItem = items.find((item) => item.str.startsWith(nextBlockLabel));

  if (!blockLabelItem || !nextBlockLabelItem) {
    return {};
  }

  const sortTopToBottom = (i1, i2) => Math.round(i2.transform[5]) - Math.round(i1.transform[5]);
  const sortLeftToRight = (i1, i2) => i1.transform[4] - i2.transform[4];

  const inBetweenY = (lowerY, upperY) => (item) => {
    const y = item.transform[5];
    return lowerY < y && y <= upperY;
  };

  return R.pipe(
    // find items in same horizontal row
    R.filter(inBetweenY(nextBlockLabelItem.transform[5], blockLabelItem.transform[5])),
    R.sortWith([sortTopToBottom, sortLeftToRight]), // sort from top to bottom, left to right
    R.filter((item) => item.str.trim() !== ''), // remove empty items
    (is) => (R.length(is) % 2 === 1 ? R.drop(1, is) : is), // remove block label if odd number of items
    R.map(R.prop('str')), // extract string values from all items
    R.map(trimEnd(':')), // remove the : at the end of the labels
    R.splitEvery(2), // split the array in smaller 2-object arrays
    R.fromPairs, // and create an object out of it
  )(items);
};

const horizontalRowField = (blockTitle, nextBlockTitle) => R.curry((label, items) => {
  const block = extractHorizontalFields(blockTitle, nextBlockTitle)(items);
  return block[label] || block[`${blockTitle} ${label}`];
});

const apneaIndexRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));
  const numbers = findFirstFourNumbers(R.drop(labelIndex, sorted));

  return {
    obstructive: R.nth(0, numbers),
    central: R.nth(1, numbers),
    mixed: R.nth(2, numbers),
    unclassified: R.nth(3, numbers),
  };
};

const oxygenSaturationEevalTimePercentageRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));
  const numbers = findFirstFourNumbers(R.drop(labelIndex, sorted));
  const duration = findNextDuration(R.drop(labelIndex, sorted));

  return {
    lessThan90: R.nth(0, numbers),
    lessThan85: R.nth(1, numbers),
    lessThan80: R.nth(2, numbers),
    lessThan88: R.nth(3, numbers),
    duration: toDuration(duration?.str),
  };
};

const startEndDurationBlock = (blockTitle) => {
  const getStringAtOffset = R.curry((offset, items) => {
    const i = findIndex(blockTitle, items);
    return i >= 0 ? R.propOr(undefined, 'str', R.nth(i + offset, items)) : undefined;
  });

  return {
    start: getStringAtOffset(2),
    end: getStringAtOffset(4),
    duration: mapDuration(getStringAtOffset(6)),
  };
};

const takeFirstAfter = (label) => (items) => {
  const index = findIndex(label, items);
  return index >= 0 ? R.propOr('', 'str', items[index + 1]).trim() : '';
};

const RECORDING_DETAILS_CODE = '0008';
const extractRelevantData = async ({ items: unsortedItems, language }) => {
  const dictionary = getDictionary(language);
  logger.info('Handling a %s pdf file', dictionary.name);

  const sortByPage = (i1, i2) => i2.page - i1.page;
  const sortTopToBottom = (i1, i2) => Math.round(i2.transform[5]) - Math.round(i1.transform[5]);
  const sortLeftToRight = (i1, i2) => i1.transform[4] - i2.transform[4];

  const visibleItems = R.filter((i) => i.height > 0 && i.width > 0, unsortedItems);

  const sortedItems = R.sortWith([sortByPage, sortTopToBottom, sortLeftToRight], visibleItems);

  const { labels } = dictionary;
  const recording = startEndDurationBlock(labels.RECORDING);
  const monitoringTime = startEndDurationBlock(labels.MONITORING_TIME_FLOW);
  const flowEvaluationTime = startEndDurationBlock(labels.FLOW_EVALUATION);
  const oxygenSaturation = startEndDurationBlock(labels.OXYGEN_SATURATION_EVALUATION);
  const eventsIndex = horizontalRowField(labels.EVENTS_INDEX, labels.SUPINE);
  const supineField = horizontalRowField(labels.SUPINE, labels.NON_SUPINE);
  const nonSupineField = horizontalRowField(labels.NON_SUPINE, labels.UPRIGHT);
  const uprightField = horizontalRowField(labels.UPRIGHT, labels.EVENTS_TOTAL);
  const eventsTotal = horizontalRowField(labels.EVENTS_TOTAL, labels.APNEA_INDEX);
  const apneaIndex = apneaIndexRow(labels.APNEA_INDEX, sortedItems);
  const cheyneStokesRespiration = horizontalRowField(labels.CHEYNE_STOKES, labels.OXYGEN_DESATURATION);
  const oxygenDesaturation = horizontalRowField(labels.OXYGEN_DESATURATION, labels.OXYGEN_SATURATION_PERCENTAGE);
  const oxygenSaturationPercentage = horizontalRowField(labels.OXYGEN_SATURATION_PERCENTAGE, labels.OXYGEN_SATURATION_EVAL_TIME_PERCENTAGE);
  const oxygenSaturationEevalTimePercentage = oxygenSaturationEevalTimePercentageRow(labels.OXYGEN_SATURATION_EVAL_TIME_PERCENTAGE, sortedItems);
  const breaths = horizontalRowField(labels.BREATHS, labels.PULSE_BPM);
  const pulseRow = horizontalRowField(labels.PULSE_BPM, labels.ANALYSIS_GUIDELINES);

  const concatUntilEndOfPage = concatUntilText(labels.PRINTED_ON);

  return [
    template('0001', 'Date', takeStr(0)),
    template('0002', 'Type', takeStr(1)),
    template('0003', 'Patient ID', takeTitledFieldValue(labels.PATIENT_ID)),
    template('0004', 'DOB', takeTitledFieldValue(labels.DOB)),
    template('0005', 'Age', takeTitledFieldValue(labels.AGE)),
    template('0006', 'Gender', takeTitledFieldValue(labels.GENDER)),
    template('0007', 'BMI', takeTitledFieldValue(labels.BMI)),
    template(RECORDING_DETAILS_CODE, 'Recording details', takeFirstAfter(labels.RECORDING_DETAILS)),
    template('0009', 'Device', takeFirstAfter(labels.DEVICE)),
    template('0100', 'Recording Start', recording.start),
    template('0101', 'Recording End', recording.end),
    template('0102', 'Recording Duration - hr', recording.duration),
    template('0201', 'Monitoring time (flow) Start ', monitoringTime.start),
    template('0202', 'Monitoring time (flow) End ', monitoringTime.end),
    template('0203', 'Monitoring time (flow) Duration - hr', (monitoringTime.duration)),
    template('0204', 'Flow evaluation Start', flowEvaluationTime.start),
    template('0205', 'Flow evaluation End', flowEvaluationTime.end),
    template('0206', 'Flow evaluation Duration - hr', (flowEvaluationTime.duration)),
    template('0301', 'Oxygen saturation evaluation Start ', oxygenSaturation.start),
    template('0302', 'Oxygen saturation evaluation End ', oxygenSaturation.end),
    template('0303', 'Oxygen saturation evaluation Duration - hr', (oxygenSaturation.duration)),
    template('0401', 'Events index REI (AHI)', eventsIndex(labels.REI_AHI)),
    template('0402', 'Events index AI', eventsIndex(labels.AI)),
    template('0403', 'Events index HI', eventsIndex(labels.HI)),
    template('0501', 'Supine Time-hr', mapDuration(supineField(labels.TIME_HR))),
    template('0502', 'Supine Percentage', supineField(labels.PERCENTAGE)),
    template('0503', 'Supine REI (AHI)', supineField(labels.REI_AHI)),
    template('0504', 'Supine AI', supineField(labels.AI)),
    template('0505', 'Supine HI', supineField(labels.HI)),
    template('0601', 'Non-supine Time-hr', mapDuration(nonSupineField(labels.TIME_HR))),
    template('0602', 'Non-supine Percentage', nonSupineField(labels.PERCENTAGE)),
    template('0603', 'Non-supine REI (AHI)', nonSupineField(labels.REI_AHI)),
    template('0604', 'Non-supine AI', nonSupineField(labels.AI)),
    template('0605', 'Non-supine HI', nonSupineField(labels.HI)),
    template('0701', 'Upright Time-hr', mapDuration(uprightField(labels.TIME_HR))),
    template('0702', 'Upright Percentage', uprightField(labels.PERCENTAGE)),
    template('0703', 'Upright REI (AHI)', uprightField(labels.REI_AHI)),
    template('0704', 'Upright AI', uprightField(labels.AI)),
    template('0705', 'Upright HI', uprightField(labels.HI)),
    template('0801', 'Events totals Apneas:', eventsTotal(labels.APNEAS)),
    template('0802', 'Events totals Hypopneas:', eventsTotal(labels.HYPOPNEAS)),
    template('0901', 'Apnea Index Obstructive:', () => apneaIndex.obstructive),
    template('0902', 'Apnea Index Central:', () => apneaIndex.central),
    template('0903', 'Apnea Index Mixed:', () => apneaIndex.mixed),
    template('0904', 'Apnea Index Unclassified:', () => apneaIndex.unclassified),
    template('1001', 'Cheyne-Stokes respiration Time - hr: ', mapDuration(cheyneStokesRespiration(labels.TIME_HR))),
    template('1002', 'Cheyne-Stokes respiration Percentage', cheyneStokesRespiration(labels.PERCENTAGE)),
    template('1101', 'Oxygen desaturation ODI', oxygenDesaturation(labels.ODI)),
    template('1102', 'Oxygen desaturation Total', oxygenDesaturation(labels.TOTAL)),
    template('1201', 'Oxygen saturation % Baseline', oxygenSaturationPercentage(labels.BASELINE)),
    template('1202', 'Oxygen saturation % Avg', oxygenSaturationPercentage(labels.AVERAGE)),
    template('1203', 'Oxygen saturation % Lowest', oxygenSaturationPercentage(labels.LOWEST)),
    template('1204', 'Oxygen saturation - eval time % <=90%sat', () => oxygenSaturationEevalTimePercentage.lessThan90),
    template('1205', 'Oxygen saturation - eval time % <=85%sat:', () => oxygenSaturationEevalTimePercentage.lessThan85),
    template('1206', 'Oxygen saturation - eval time % <=80%sat', () => oxygenSaturationEevalTimePercentage.lessThan80),
    template('1207', 'Oxygen saturation - eval time % <=88%sat', () => oxygenSaturationEevalTimePercentage.lessThan88),
    template('1208', 'Oxygen saturation - eval time % <=88%Time - hr:', () => oxygenSaturationEevalTimePercentage.duration),
    template('1301', 'Breaths Total', breaths(labels.TOTAL)),
    template('1302', 'Breaths Avg/min', breaths(labels.AVG_PER_MINUTE)),
    template('1303', 'Breaths Snores', breaths(labels.SNORES)),
    template('1401', 'Pulse - bpm Min', pulseRow(labels.MINIMUM)),
    template('1402', 'Pulse - bpm Avg', pulseRow(labels.AVERAGE)),
    template('1403', 'Pulse - bpm Max', pulseRow(labels.MAXIMUM)),
    template('1500', 'Analysis guidelines', takeFirstAfter(labels.ANALYSIS_GUIDELINES)),
    template('1600', 'Adicional data', (items) => {
      const analysisGuidelinesIndex = findIndex(labels.ANALYSIS_GUIDELINES, items);
      const concatFn = concatUntilEndOfPage(analysisGuidelinesIndex + 2);
      return concatFn(items);
    }),
    template('1700', 'Interpretation', (items) => {
      const interpretationIndex = findIndex(labels.INTERPRETATION, items);
      const concatFn = concatUntilEndOfPage(interpretationIndex + 1);
      return concatFn(items);
    }),
  ].map((fn) => fn(visibleItems));
};

const extractTextBlocks = (includedPages) => async (doc) => {
  logger.debug('Extracting text content');

  const validPages = R.intersection(R.range(1, doc.numPages + 1), includedPages);

  const pagesContent = await Promise.all(validPages.map((page) => doc.getPage(page)));
  const textBlocksContent = await Promise.all(pagesContent.map((pc) => pc.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  })));

  const addPageToItems = (promiseResult, index) => {
    const newItems = promiseResult.items.map(R.assoc('page', index + 1));
    return { ...promiseResult, items: newItems };
  };
  return textBlocksContent
    .map(addPageToItems)
    .map(R.prop('items'))
    .flat()
    .filter(R.complement(emptySpaceEntry));
};

const validateExtractedData = (result) => {
  // if the patient ID code could not be extracted, this PDF is invalid
  const patientId = result.find((e) => e.code === RECORDING_DETAILS_CODE);
  return patientId.value ? result : undefined;
};

function tmpFile() {
  return path.join(os.tmpdir(), `upload.${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.pdf`);
}

const attachLanguage = (items) => ({ items, language: determineLanguage(items) });

const parsePdfFile = (file) => pdfJs.getDocument(file).promise
  .then(extractTextBlocks([1, 2]))
  .then(attachLanguage)
  .then(extractRelevantData)
  .then(validateExtractedData);

const extractFile = (req) => {
  if (req.files?.pdf) {
    return req.files.pdf;
  }

  const buffer = Buffer.from(req.body.pdf, 'base64');
  const tempPdfFilePath = tmpFile();

  logger.debug('Saving base64 uploaded pdf file to file path %s', tempPdfFilePath);

  fs.writeFileSync(tempPdfFilePath, buffer);
  return tempPdfFilePath;
};

const pdfHandler = async (req, res) => {
  if (!req.files && !req.body?.pdf) {
    res.status(400).json({
      status: false,
      message: 'No file uploaded',
    });
  } else {
    parsePdfFile(extractFile(req)).then((data) => {
      if (data) {
        res.send({
          message: 'Data extracted successfully',
          data,
        });
      } else {
        res.status(400).send('Unable to extract relevant data');
      }
    }).catch((err) => {
      logger.error(err);
      res.status(500).send(err);
    });
  }
};

module.exports = { pdfHandler, parsePdfFile };
