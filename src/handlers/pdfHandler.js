const R = require('ramda');

const pdfJs = require('pdfjs-dist/legacy/build/pdf.js');
const { loggers } = require('winston');
const logger = require('../tools/logger');

const emptySpaceEntry = (item) => item.width === 0 && item.height === 0;

const take = (index) => (arr) => (index < 0 || index >= arr.length ? undefined : arr[index]);

const takeStr = (index) => (arr) => R.prop('str', take(index)(arr));

const mapDuration = R.curry((extractStringFn, items) => {
  const str = extractStringFn(items);
  return str ? str.padStart(5, '0') : str;
});

const trimEnd = R.curry((char, str) => {
  if (str && str.endsWith(char)) {
    return trimEnd(char, R.dropLast(1, str)); // recursively remove multiple char at the end
  }
  return str;
});

const findIndex = (label, items) => items.findIndex((i) => {
  const value = i.str.trim();
  return value === label || value === `${label}:`;
});

const concatUntil = (fn, index) => R.pipe(
  R.drop(index),
  R.takeWhile(R.complement(fn)),
  R.map(R.prop('str')),
  R.join(' '),
);

const concatUntilEndOfPage = (index) => concatUntil((item) => R.trim(item.str).startsWith('Printed on'), index);

const takeSecondPartOfString = (index) => (arr) => R.pipe(
  take(index),
  R.propOr('', 'str'),
  R.split(':'),
  R.nth(1),
  R.defaultTo(''), // in case nothing is found, use a blank string
  R.trim,
)(arr);

const takeTitledFieldValue = R.curry((title, items) => {
  const strPropStartsWith = R.pipe(R.prop('str'), R.startsWith(`${title}:`));

  const index = R.findIndex(strPropStartsWith, items);
  return takeSecondPartOfString(index)(items);
});

const template = (code, name, valueFn) => (items) => ({
  code,
  name,
  value: valueFn(items),
});

const extractHorizontalFields = (blockLabel, nextBlockLabel) => (items) => {
  const blockLabelItem = items.find((item) => item.str === blockLabel);
  const nextBlockLabelItem = items.find((item) => item.str === nextBlockLabel);

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
    R.drop(1), // remove block label
    R.map(R.prop('str')), // extract string values from all items
    R.map(trimEnd(':')), // remove the : at the end of the labels
    R.splitEvery(2), // split the array in smaller 2-object arrays
    R.fromPairs, // and create an object out of it
  )(items);
};

const horizontalRowField = (blockTitle, nextBlockTitle) => R.curry((label, items) => {
  const block = extractHorizontalFields(blockTitle, nextBlockTitle)(items);
  return block[label];
});

const startEndDurationBlock = R.curry((blockTitle, label, items) => {
  const i = findIndex(blockTitle, items);
  if (i < 0) {
    return undefined;
  }
  const offset = 2 * ['', 'Start', 'End', 'Duration - hr'].indexOf(label);

  return R.propOr(undefined, 'str', R.nth(i + offset, items));
});

const recording = startEndDurationBlock('Recording');
const monitoringTime = startEndDurationBlock('Monitoring time (flow)');
const flowEvaluationTime = startEndDurationBlock('Flow evaluation');
const oxygenSaturation = startEndDurationBlock('Oxygen saturation evaluation');
const eventsIndex = horizontalRowField('Events index', 'Supine');
const supineField = horizontalRowField('Supine', 'Non-supine');
const nonSupineField = horizontalRowField('Non-supine', 'Upright');
const uprightField = horizontalRowField('Upright', 'Events totals');
const eventsTotal = horizontalRowField('Events totals', 'Apnea Index');
const apneaIndex = horizontalRowField('Apnea Index', 'Cheyne-Stokes respiration');
const cheyneStokesRespiration = horizontalRowField('Cheyne-Stokes respiration', 'Oxygen desaturation');
const oxygenDesaturation = horizontalRowField('Oxygen desaturation', 'Oxygen saturation %');
const oxygenSaturationPercentage = horizontalRowField('Oxygen saturation %', 'Oxygen saturation - eval time %');
const oxygenSaturationEevalTimePercentage = horizontalRowField('Oxygen saturation - eval time %', 'Breaths');
const breaths = horizontalRowField('Breaths', 'Pulse - bpm');
const pulseRow = horizontalRowField('Pulse - bpm', 'Analysis guidelines:');

const PATIENT_ID_INDEX = 8;
const PATIENT_ID_CODE = '0003';

const takeFirstAfter = (label) => (items) => {
  const index = findIndex(label, items);
  return index >= 0 ? R.propOr('', 'str', items[index + 1]).trim() : '';
};

const extractRelevantData = async (allItems) => {
  const visibleItems = allItems.filter((i) => i.height > 0 && i.width > 0);
  return [
    template('0001', 'Date', takeStr(0)),
    template('0002', 'Type', takeStr(1)),
    template(PATIENT_ID_CODE, 'Patient ID', takeSecondPartOfString(PATIENT_ID_INDEX)),
    template('0004', 'DOB', takeTitledFieldValue('DOB')),
    template('0005', 'Age', takeTitledFieldValue('Age')),
    template('0006', 'Gender', takeTitledFieldValue('Gender')),
    template('0007', 'BMI', takeTitledFieldValue('BMI')),
    template('0008', 'Recording details', takeFirstAfter('Recording details')),
    template('0009', 'Device', takeFirstAfter('Device')),
    template('0100', 'Recording Start', recording('Start')),
    template('0101', 'Recording End', recording('End')),
    template('0102', 'Recording Duration - hr', mapDuration(recording('Duration - hr'))),
    template('0201', 'Monitoring time (flow) Start ', monitoringTime('Start')),
    template('0202', 'Monitoring time (flow) End ', monitoringTime('End')),
    template('0203', 'Monitoring time (flow) Duration - hr', mapDuration(monitoringTime('Duration - hr'))),
    template('0204', 'Flow evaluation Start', flowEvaluationTime('Start')),
    template('0205', 'Flow evaluation End', flowEvaluationTime('End')),
    template('0206', 'Flow evaluation Duration - hr', mapDuration(flowEvaluationTime('Duration - hr'))),
    template('0301', 'Oxygen saturation evaluation Start ', oxygenSaturation('Start')),
    template('0302', 'Oxygen saturation evaluation End ', oxygenSaturation('End')),
    template('0303', 'Oxygen saturation evaluation Duration - hr', mapDuration(oxygenSaturation('Duration - hr'))),
    template('0401', 'Events index REI (AHI)', eventsIndex('REI (AHI)')),
    template('0402', 'Events index AI', eventsIndex('AI')),
    template('0403', 'Events index HI', eventsIndex('HI')),
    template('0501', 'Supine Time-hr', mapDuration(supineField('Time - hr'))),
    template('0502', 'Supine Percentage', supineField('Percentage')),
    template('0503', 'Supine REI (AHI)', supineField('REI (AHI)')),
    template('0504', 'Supine AI', supineField('AI')),
    template('0505', 'Supine HI', supineField('HI')),
    template('0601', 'Non-supine Time-hr', mapDuration(nonSupineField('Time - hr'))),
    template('0602', 'Non-supine Percentage', nonSupineField('Percentage')),
    template('0603', 'Non-supine REI (AHI)', nonSupineField('REI (AHI)')),
    template('0604', 'Non-supine AI', nonSupineField('AI')),
    template('0605', 'Non-supine HI', nonSupineField('HI')),
    template('0701', 'Upright Time-hr', mapDuration(uprightField('Time - hr'))),
    template('0702', 'Upright Percentage', uprightField('Percentage')),
    template('0703', 'Upright REI (AHI)', uprightField('REI (AHI)')),
    template('0704', 'Upright AI', uprightField('AI')),
    template('0705', 'Upright HI', uprightField('HI')),
    template('0801', 'Events totals Apneas:', eventsTotal('Apneas')),
    template('0802', 'Events totals Hypopneas:', eventsTotal('Hypopneas')),
    template('0901', 'Apnea Index Obstructive:', apneaIndex('Obstructive')),
    template('0902', 'Apnea Index Central:', apneaIndex('Central')),
    template('0903', 'Apnea Index Mixed:', apneaIndex('Mixed')),
    template('0904', 'Apnea Index Unclassified:', apneaIndex('Unclassified')),
    template('1001', 'Cheyne-Stokes respiration Time - hr: ', mapDuration(cheyneStokesRespiration('Time - hr'))),
    template('1002', 'Cheyne-Stokes respiration Percentage', cheyneStokesRespiration('Percentage')),
    template('1101', 'Oxygen desaturation ODI', oxygenDesaturation('ODI')),
    template('1102', 'Oxygen desaturation Total', oxygenDesaturation('Total')),
    template('1201', 'Oxygen saturation % Baseline', oxygenSaturationPercentage('Baseline')),
    template('1202', 'Oxygen saturation % Avg', oxygenSaturationPercentage('Avg')),
    template('1203', 'Oxygen saturation % Lowest', oxygenSaturationPercentage('Lowest')),
    template('1204', 'Oxygen saturation - eval time % <=90%sat', oxygenSaturationEevalTimePercentage('<=90%sat')),
    template('1205', 'Oxygen saturation - eval time % <=85%sat:', oxygenSaturationEevalTimePercentage('<=85%sat')),
    template('1206', 'Oxygen saturation - eval time % <=80%sat', oxygenSaturationEevalTimePercentage('<=80%sat')),
    template('1207', 'Oxygen saturation - eval time % <=88%sat', oxygenSaturationEevalTimePercentage('<=88%sat')),
    template('1208', 'Oxygen saturation - eval time % <=88%Time - hr:', mapDuration(oxygenSaturationEevalTimePercentage('<=88%Time - hr'))),
    template('1301', 'Breaths Total', breaths('Total')),
    template('1302', 'Breaths Avg/min', breaths('Avg/min')),
    template('1303', 'Breaths Snores', breaths('Snores')),
    template('1401', 'Pulse - bpm Min', pulseRow('Min')),
    template('1402', 'Pulse - bpm Avg', pulseRow('Avg')),
    template('1403', 'Pulse - bpm Max', pulseRow('Max')),
    template('1500', 'Analysis guidelines', takeFirstAfter('Analysis guidelines')),
    template('1600', 'Adicional data', (items) => {
      const analysisGuidelinesIndex = findIndex('Analysis guidelines', items);
      const concatFn = concatUntilEndOfPage(analysisGuidelinesIndex + 2);
      return concatFn(items);
    }),
    template('1700', 'Interpretation', (items) => {
      const interpretationIndex = findIndex('Interpretation', items);
      const concatFn = concatUntilEndOfPage(interpretationIndex + 1);
      return concatFn(items);
    }),
  ].map((fn) => fn(visibleItems));
};

const extractTextContent = async (doc) => {
  logger.debug('Extracting text content');
  const extractTextContentStartingFromPage = async (pageNumber) => {
    if (pageNumber > doc.numPages) {
      return [];
    }

    const page = await doc.getPage(pageNumber);
    const pageTextContent = await page.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });
    const nextPageItems = await extractTextContentStartingFromPage(pageNumber + 1);
    return [...pageTextContent.items, ...nextPageItems];
  };

  const allItems = await extractTextContentStartingFromPage(1);
  return allItems.filter(R.complement(emptySpaceEntry));
};

const validateExtractedData = (result) => {
  // if the patient ID code could not be extracted, this PDF is invalid
  const patientId = result.find((e) => e.code === PATIENT_ID_CODE);
  return patientId.value ? result : undefined;
};

const parsePdfFile = (file) => pdfJs.getDocument(file).promise
  .then(extractTextContent)
  .then(extractRelevantData)
  .then(validateExtractedData);

const pdfHandler = async (req, res) => {
  if (!req.files) {
    res.status(400).json({
      status: false,
      message: 'No file uploaded',
    });
  } else {
    const pdfFile = req.files.pdf;

    parsePdfFile(pdfFile).then((data) => {
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
