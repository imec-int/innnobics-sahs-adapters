const R = require('ramda');

const pdfJs = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const logger = require('../tools/logger');
const {
  findFirstFourNumbers, findNextDuration,
  toDuration, startEndDurationBlock, horizontalRowField, concatUntilText,
  takeStr, takeTitledFieldValue, takeFirstAfter, mapDuration, findTextBlockIndex, extractTextBlocks,
} = require('./pdf');

const { determineLanguage, getDictionary } = require('./languages');

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
    extractItemWithFn('0100', 'Recording Start', recording.start),
    extractItemWithFn('0101', 'Recording End', recording.end),
    extractItemWithFn('0102', 'Recording Duration - hr', recording.duration),
    extractItemWithFn('0201', 'Monitoring time (flow) Start ', monitoringTime.start),
    extractItemWithFn('0202', 'Monitoring time (flow) End ', monitoringTime.end),
    extractItemWithFn('0203', 'Monitoring time (flow) Duration - hr', (monitoringTime.duration)),
    extractItemWithFn('0204', 'Flow evaluation Start', flowEvaluationTime.start),
    extractItemWithFn('0205', 'Flow evaluation End', flowEvaluationTime.end),
    extractItemWithFn('0206', 'Flow evaluation Duration - hr', flowEvaluationTime.duration),
    extractItemWithFn('0301', 'Oxygen saturation evaluation Start ', oxygenSaturation.start),
    extractItemWithFn('0302', 'Oxygen saturation evaluation End ', oxygenSaturation.end),
    extractItemWithFn('0303', 'Oxygen saturation evaluation Duration - hr', oxygenSaturation.duration),
    extractItemWithFn('0401', 'Events index REI (AHI)', eventsIndex(labels.REI_AHI)),
    extractItemWithFn('0402', 'Events index AI', eventsIndex(labels.AI)),
    extractItemWithFn('0403', 'Events index HI', eventsIndex(labels.HI)),
    extractItemWithFn('0501', 'Supine Time-hr', mapDuration(supineField(labels.TIME_HR))),
    extractItemWithFn('0502', 'Supine Percentage', supineField(labels.PERCENTAGE)),
    extractItemWithFn('0503', 'Supine REI (AHI)', supineField(labels.REI_AHI)),
    extractItemWithFn('0504', 'Supine AI', supineField(labels.AI)),
    extractItemWithFn('0505', 'Supine HI', supineField(labels.HI)),
    extractItemWithFn('0601', 'Non-supine Time-hr', mapDuration(nonSupineField(labels.TIME_HR))),
    extractItemWithFn('0602', 'Non-supine Percentage', nonSupineField(labels.PERCENTAGE)),
    extractItemWithFn('0603', 'Non-supine REI (AHI)', nonSupineField(labels.REI_AHI)),
    extractItemWithFn('0604', 'Non-supine AI', nonSupineField(labels.AI)),
    extractItemWithFn('0605', 'Non-supine HI', nonSupineField(labels.HI)),
    extractItemWithFn('0701', 'Upright Time-hr', mapDuration(uprightField(labels.TIME_HR))),
    extractItemWithFn('0702', 'Upright Percentage', uprightField(labels.PERCENTAGE)),
    extractItemWithFn('0703', 'Upright REI (AHI)', uprightField(labels.REI_AHI)),
    extractItemWithFn('0704', 'Upright AI', uprightField(labels.AI)),
    extractItemWithFn('0705', 'Upright HI', uprightField(labels.HI)),
    extractItemWithFn('0801', 'Events totals Apneas:', eventsTotal(labels.APNEAS)),
    extractItemWithFn('0802', 'Events totals Hypopneas:', eventsTotal(labels.HYPOPNEAS)),
    useFixedValue('0901', 'Apnea Index Obstructive:', apneaIndex.obstructive),
    useFixedValue('0902', 'Apnea Index Central:', apneaIndex.central),
    useFixedValue('0903', 'Apnea Index Mixed:', apneaIndex.mixed),
    useFixedValue('0904', 'Apnea Index Unclassified:', apneaIndex.unclassified),
    extractItemWithFn('1001', 'Cheyne-Stokes respiration Time - hr: ', mapDuration(cheyneStokesRespiration(labels.TIME_HR))),
    extractItemWithFn('1002', 'Cheyne-Stokes respiration Percentage', cheyneStokesRespiration(labels.PERCENTAGE)),
    extractItemWithFn('1101', 'Oxygen desaturation ODI', oxygenDesaturation(labels.ODI)),
    extractItemWithFn('1102', 'Oxygen desaturation Total', oxygenDesaturation(labels.TOTAL)),
    extractItemWithFn('1201', 'Oxygen saturation % Baseline', oxygenSaturationPercentage(labels.BASELINE)),
    extractItemWithFn('1202', 'Oxygen saturation % Avg', oxygenSaturationPercentage(labels.AVERAGE)),
    extractItemWithFn('1203', 'Oxygen saturation % Lowest', oxygenSaturationPercentage(labels.LOWEST)),
    extractItemWithFn('1204', 'Oxygen saturation - eval time % <=90%sat', () => oxygenSaturationEevalTimePercentage.lessThan90),
    extractItemWithFn('1205', 'Oxygen saturation - eval time % <=85%sat:', () => oxygenSaturationEevalTimePercentage.lessThan85),
    extractItemWithFn('1206', 'Oxygen saturation - eval time % <=80%sat', () => oxygenSaturationEevalTimePercentage.lessThan80),
    extractItemWithFn('1207', 'Oxygen saturation - eval time % <=88%sat', () => oxygenSaturationEevalTimePercentage.lessThan88),
    extractItemWithFn('1208', 'Oxygen saturation - eval time % <=88%Time - hr:', () => oxygenSaturationEevalTimePercentage.duration),
    extractItemWithFn('1301', 'Breaths Total', breaths(labels.TOTAL)),
    extractItemWithFn('1302', 'Breaths Avg/min', breaths(labels.AVG_PER_MINUTE)),
    extractItemWithFn('1303', 'Breaths Snores', breaths(labels.SNORES)),
    extractItemWithFn('1401', 'Pulse - bpm Min', pulseRow(labels.MINIMUM)),
    extractItemWithFn('1402', 'Pulse - bpm Avg', pulseRow(labels.AVERAGE)),
    extractItemWithFn('1403', 'Pulse - bpm Max', pulseRow(labels.MAXIMUM)),
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
