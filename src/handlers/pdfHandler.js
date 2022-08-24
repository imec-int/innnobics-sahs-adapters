const R = require('ramda');

const pdfJs = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { min } = require('ramda');
const logger = require('../tools/logger');
const {
  findNextDuration,
  startEndDurationRow, horizontalRowField, concatUntilText,
  takeStr, takeTitledFieldValue, takeFirstAfter, findTextBlockIndex, extractTextBlocks,
  findNext2Numbers, findNextNumber, findNext4Numbers, findNext3Numbers,
} = require('./pdf');

const { determineLanguage, getDictionary } = require('./languages/languages');

const extractItemWithFn = (code, name, valueFn) => (items) => ({
  code,
  name,
  value: valueFn(items),
});

const useFixedValue = (code, name, value) => () => ({
  code,
  name,
  value,
});

const apneaIndexRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));
  const numbers = findNext4Numbers(labelIndex, sorted);

  return {
    obstructive: R.nth(0, numbers),
    central: R.nth(1, numbers),
    mixed: R.nth(2, numbers),
    unclassified: R.nth(3, numbers),
  };
};

const cheyneStokesRespirationRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));

  return {
    time: findNextDuration(labelIndex, sorted),
    percentage: findNextNumber(labelIndex, sorted),
  };
};

const oxygenDesaturationRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));
  const numbers = findNext2Numbers(labelIndex, sorted);
  return {
    odi: numbers[0],
    total: numbers[1],
  };
};

const oxygenSaturationPercentageRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));
  const numbers = findNext3Numbers(labelIndex, sorted);
  return {
    baseline: numbers[0],
    average: numbers[1],
    lowest: numbers[2],
  };
};

const oxygenSaturationEevalTimePercentageRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));
  const numbers = findNext4Numbers(labelIndex, sorted);
  const duration = findNextDuration(labelIndex, sorted);

  return {
    lessThan90: R.nth(0, numbers),
    lessThan85: R.nth(1, numbers),
    lessThan80: R.nth(2, numbers),
    lessThan88: R.nth(3, numbers),
    duration,
  };
};

const breathsRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));
  const numbers = findNext3Numbers(labelIndex, sorted);

  return {
    total: numbers[0],
    averagePerMinute: numbers[1],
    snores: numbers[2],
  };
};

const pulseRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));
  const numbers = findNext3Numbers(labelIndex, sorted);

  return {
    min: numbers[0],
    average: numbers[1],
    max: numbers[2],
  };
};

const eventsRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));
  const numbers = findNext3Numbers(labelIndex, sorted);

  return {
    reiAhi: R.nth(0, numbers),
    ai: R.nth(1, numbers),
    hi: R.nth(2, numbers),
  };
};

const timedReiRow = (blockTitle, sorted) => {
  const labelIndex = sorted.findIndex((item) => item.str.startsWith(blockTitle));
  const duration = findNextDuration(labelIndex, sorted);
  const numbers = findNext4Numbers(labelIndex, sorted);

  return {
    timeHr: duration,
    percentage: R.nth(0, numbers),
    reiAhi: R.nth(1, numbers),
    ai: R.nth(2, numbers),
    hi: R.nth(3, numbers),
  };
};

const supineRow = timedReiRow;
const nonSupineRow = timedReiRow;
const uprightRow = timedReiRow;

const eventsTotalRow = (title, items) => {
  const labelIndex = items.findIndex((item) => item.str.startsWith(title));
  const numbers = findNext2Numbers(labelIndex, items);

  return {
    apneas: numbers[0],
    hypopneas: numbers[1],
  };
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
  const recording = startEndDurationRow(labels.RECORDING, sortedItems);
  const monitoringTime = startEndDurationRow(labels.MONITORING_TIME_FLOW, sortedItems);
  const flowEvaluationTime = startEndDurationRow(labels.FLOW_EVALUATION, sortedItems);
  const oxygenSaturation = startEndDurationRow(labels.OXYGEN_SATURATION_EVALUATION, sortedItems);
  const eventsFields = eventsRow(labels.EVENTS_INDEX, sortedItems);
  const supineFields = supineRow(labels.SUPINE, sortedItems);
  const nonSupineFields = nonSupineRow(labels.NON_SUPINE, sortedItems);
  const uprightFields = uprightRow(labels.UPRIGHT, sortedItems);
  const eventsTotal = eventsTotalRow(labels.EVENTS_TOTAL, sortedItems);
  const apneaIndex = apneaIndexRow(labels.APNEA_INDEX, sortedItems);
  const cheyneStokesRespiration = cheyneStokesRespirationRow(labels.CHEYNE_STOKES, sortedItems);
  const oxygenDesaturation = oxygenDesaturationRow(labels.OXYGEN_DESATURATION, sortedItems);
  const oxygenSaturationPercentage = oxygenSaturationPercentageRow(labels.OXYGEN_SATURATION_PERCENTAGE, sortedItems);
  const oxygenSaturationEevalTimePercentage = oxygenSaturationEevalTimePercentageRow(labels.OXYGEN_SATURATION_EVAL_TIME_PERCENTAGE, sortedItems);
  const breaths = breathsRow(labels.BREATHS, sortedItems);
  const pulse = pulseRow(labels.PULSE_BPM, sortedItems);

  const concatUntilEndOfPage = concatUntilText(labels.PRINTED_ON);

  const takeInterpretation = (items) => {
    const interpretationIndex = findTextBlockIndex(labels.INTERPRETATION, items);
    const concatFn = concatUntilEndOfPage(interpretationIndex + 1);
    return concatFn(items);
  };

  function takeAdditionalData(items) {
    const analysisGuidelinesIndex = findTextBlockIndex(labels.ANALYSIS_GUIDELINES, items);
    const concatFn = concatUntilEndOfPage(analysisGuidelinesIndex + 2);
    return concatFn(items);
  }

  return [
    extractItemWithFn('0001', 'Date', takeStr(0)),
    extractItemWithFn('0002', 'Type', takeStr(1)),
    extractItemWithFn('0003', 'Patient ID', takeTitledFieldValue(labels.PATIENT_ID)),
    extractItemWithFn('0004', 'DOB', takeTitledFieldValue(labels.DOB)),
    extractItemWithFn('0005', 'Age', takeTitledFieldValue(labels.AGE)),
    extractItemWithFn('0006', 'Gender', takeTitledFieldValue(labels.GENDER)),
    extractItemWithFn('0007', 'BMI', takeTitledFieldValue(labels.BMI)),
    extractItemWithFn(RECORDING_DETAILS_CODE, 'Recording details', takeFirstAfter(labels.RECORDING_DETAILS)),
    extractItemWithFn('0009', 'Device', takeFirstAfter(labels.DEVICE)),
    useFixedValue('0100', 'Recording Start', recording.start),
    useFixedValue('0101', 'Recording End', recording.end),
    useFixedValue('0102', 'Recording Duration - hr', recording.duration),
    useFixedValue('0201', 'Monitoring time (flow) Start ', monitoringTime.start),
    useFixedValue('0202', 'Monitoring time (flow) End ', monitoringTime.end),
    useFixedValue('0203', 'Monitoring time (flow) Duration - hr', (monitoringTime.duration)),
    useFixedValue('0204', 'Flow evaluation Start', flowEvaluationTime.start),
    useFixedValue('0205', 'Flow evaluation End', flowEvaluationTime.end),
    useFixedValue('0206', 'Flow evaluation Duration - hr', flowEvaluationTime.duration),
    useFixedValue('0301', 'Oxygen saturation evaluation Start ', oxygenSaturation.start),
    useFixedValue('0302', 'Oxygen saturation evaluation End ', oxygenSaturation.end),
    useFixedValue('0303', 'Oxygen saturation evaluation Duration - hr', oxygenSaturation.duration),
    useFixedValue('0401', 'Events index REI (AHI)', eventsFields.reiAhi),
    useFixedValue('0402', 'Events index AI', eventsFields.ai),
    useFixedValue('0403', 'Events index HI', eventsFields.hi),
    useFixedValue('0501', 'Supine Time-hr', supineFields.timeHr),
    useFixedValue('0502', 'Supine Percentage', supineFields.percentage),
    useFixedValue('0503', 'Supine REI (AHI)', supineFields.reiAhi),
    useFixedValue('0504', 'Supine AI', supineFields.ai),
    useFixedValue('0505', 'Supine HI', supineFields.hi),
    useFixedValue('0601', 'Non-supine Time-hr', nonSupineFields.timeHr),
    useFixedValue('0602', 'Non-supine Percentage', nonSupineFields.percentage),
    useFixedValue('0603', 'Non-supine REI (AHI)', nonSupineFields.reiAhi),
    useFixedValue('0604', 'Non-supine AI', nonSupineFields.ai),
    useFixedValue('0605', 'Non-supine HI', nonSupineFields.hi),
    useFixedValue('0701', 'Upright Time-hr', uprightFields.timeHr),
    useFixedValue('0702', 'Upright Percentage', uprightFields.percentage),
    useFixedValue('0703', 'Upright REI (AHI)', uprightFields.reiAhi),
    useFixedValue('0704', 'Upright AI', uprightFields.ai),
    useFixedValue('0705', 'Upright HI', uprightFields.hi),
    useFixedValue('0801', 'Events totals Apneas:', eventsTotal.apneas),
    useFixedValue('0802', 'Events totals Hypopneas:', eventsTotal.hypopneas),
    useFixedValue('0901', 'Apnea Index Obstructive:', apneaIndex.obstructive),
    useFixedValue('0902', 'Apnea Index Central:', apneaIndex.central),
    useFixedValue('0903', 'Apnea Index Mixed:', apneaIndex.mixed),
    useFixedValue('0904', 'Apnea Index Unclassified:', apneaIndex.unclassified),
    useFixedValue('1001', 'Cheyne-Stokes respiration Time - hr: ', cheyneStokesRespiration.time),
    useFixedValue('1002', 'Cheyne-Stokes respiration Percentage', cheyneStokesRespiration.percentage),
    useFixedValue('1101', 'Oxygen desaturation ODI', oxygenDesaturation.odi),
    useFixedValue('1102', 'Oxygen desaturation Total', oxygenDesaturation.total),
    useFixedValue('1201', 'Oxygen saturation % Baseline', oxygenSaturationPercentage.baseline),
    useFixedValue('1202', 'Oxygen saturation % Avg', oxygenSaturationPercentage.average),
    useFixedValue('1203', 'Oxygen saturation % Lowest', oxygenSaturationPercentage.lowest),
    useFixedValue('1204', 'Oxygen saturation - eval time % <=90%sat', oxygenSaturationEevalTimePercentage.lessThan90),
    useFixedValue('1205', 'Oxygen saturation - eval time % <=85%sat:', oxygenSaturationEevalTimePercentage.lessThan85),
    useFixedValue('1206', 'Oxygen saturation - eval time % <=80%sat', oxygenSaturationEevalTimePercentage.lessThan80),
    useFixedValue('1207', 'Oxygen saturation - eval time % <=88%sat', oxygenSaturationEevalTimePercentage.lessThan88),
    useFixedValue('1208', 'Oxygen saturation - eval time % <=88%Time - hr:', oxygenSaturationEevalTimePercentage.duration),
    useFixedValue('1301', 'Breaths Total', breaths.total),
    useFixedValue('1302', 'Breaths Avg/min', breaths.averagePerMinute),
    useFixedValue('1303', 'Breaths Snores', breaths.snores),
    useFixedValue('1401', 'Pulse - bpm Min', pulse.min),
    useFixedValue('1402', 'Pulse - bpm Avg', pulse.average),
    useFixedValue('1403', 'Pulse - bpm Max', pulse.max),
    extractItemWithFn('1500', 'Analysis guidelines', takeFirstAfter(labels.ANALYSIS_GUIDELINES)),
    extractItemWithFn('1600', 'Adicional data', takeAdditionalData),
    extractItemWithFn('1700', 'Interpretation', takeInterpretation),
  ].map((fn) => fn(visibleItems));
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
