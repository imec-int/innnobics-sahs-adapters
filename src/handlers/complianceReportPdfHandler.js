const pdfJs = require('pdfjs-dist/legacy/build/pdf');
const R = require('ramda');
const { genericPdfHandler } = require('./genericPdfHandler');
const {
  extractTextBlocks,
  sortItemsLeftToRight,
  takeTitledFieldValue,
  findGender,
  takeFirstAfter,
  takeStr, findTitledItem,
  sortTopToBottom,
  sortRightToLeft, endsOnSameRightMargin, isBelow, isAbove, sortBottomToTop,
} = require('./pdf');
const { getDictionary } = require('./languages/complianceReport/languages');

function threeDigitRow(title, items) {
  const labelIndex = items.findIndex((item) => item.str.startsWith(title));
  if (labelIndex >= 0) {
    return [
      R.always(takeStr(labelIndex + 2)(items)),
      R.always(takeStr(labelIndex + 4)(items)),
      R.always(takeStr(labelIndex + 6)(items)),
    ];
  }
  return [
    R.always(''),
    R.always(''),
    R.always(''),
  ];
}

function takeSpo2Row(labels, items) {
  const index = items.findIndex((item) => item.str.startsWith(labels.THERAPY_SPO2_PERCENTAGE_TIME));
  if (index >= 0) {
    const itemsFromTime88Item = R.drop(index, items);
    const time = takeStr(1)(itemsFromTime88Item);
    const median = takeFirstAfter(labels.THERAPY_SPO2_MEDIAN)(itemsFromTime88Item);
    const fiftyNinthPercentile = takeFirstAfter(labels.THERAPY_SPO2_FIFTY_NINTH_PERCENTILE)(itemsFromTime88Item);
    return {
      time: R.always(time),
      median: R.always(median),
      fiftyNinthPercentile: R.always(fiftyNinthPercentile),
    };
  }
  return { time: R.always(''), median: R.always(''), fiftyNinthPercentile: R.always('') };
}

function takeAge(labels) {
  return function findItem(items) {
    return R.replace(/\D+/g, '', takeTitledFieldValue(labels.AGE, items));
  };
}

function findDateRange(labels) {
  return function find(items) {
    const patientIdItem = findTitledItem(labels.PATIENT_ID, items);

    return R.pipe(
      R.filter((i) => isAbove(i, patientIdItem) && endsOnSameRightMargin(i, patientIdItem)),
      R.last,
      R.prop('str'),
    )(items);
  };
}

function extractRelevantData(items) {
  const dictionary = getDictionary('english');
  const { labels } = dictionary;

  const therapyPressure = threeDigitRow(labels.THERAPY_PRESSURE, items);
  const therapyLeaks = threeDigitRow(labels.THERAPY_LEAKS, items);
  const eventsPerHour = threeDigitRow(labels.THERAPY_EVENTS_PER_HOUR, items);
  const apnoeaIndex = threeDigitRow(labels.THERAPY_APNOEA_INDEX, items);
  const spo2Row = takeSpo2Row(labels, items);

  return [
    ['1001', 'Date', findDateRange(labels)],
    ['1002', 'Patient ID', takeTitledFieldValue(labels.PATIENT_ID)],
    ['1003', 'DOB', takeTitledFieldValue(labels.DOB)],
    ['1004', 'Age', takeAge(labels)],
    ['1005', 'Gender', findGender(dictionary)],
    ['1006', 'Usage days', takeFirstAfter(labels.USAGE_DAYS)],
    ['1007', '>= 4 hours', takeFirstAfter(labels.USAGE_DAYS_GTE_4_HOURS)],
    ['1008', '< 4 hours', takeFirstAfter(labels.USAGE_DAYS_LT_4_HOURS)],
    ['1009', 'Average usage (total days)', takeFirstAfter(labels.AVERAGE_USAGE_TOTAL_DAYS)],
    ['1010', 'Average usage (days used)', takeFirstAfter(labels.AVERAGE_USAGE_DAYS_USED)],
    ['1011', 'Median usage (days used)', takeFirstAfter(labels.MEDIAN_USAGE_DAYS_USED)],
    ['1012', 'Serial number', takeFirstAfter(labels.AIRSENSE_10_SERIAL_NUMBER)],
    ['1013', 'Mode', takeFirstAfter(labels.AIRSENSE_10_MODE)],
    ['1014', 'Min Pressure', takeFirstAfter(labels.AIRSENSE_10_MIN_PRESSURE)],
    ['1015', 'Max Pressure', takeFirstAfter(labels.AIRSENSE_10_MAX_PRESSURE)],
    ['1016', 'EPR level', takeFirstAfter(labels.AIRSENSE_10_EPR_LEVEL)],
    ['1017', 'Response', takeFirstAfter(labels.AIRSENSE_10_RESPONSE)],
    ['1018', 'Pressure -cm H2O - median', therapyPressure[0]],
    ['1019', 'Pressure -cm H2O - percentile 95', therapyPressure[1]],
    ['1020', 'Pressure -cm H2O - max', therapyPressure[2]],
    ['1021', 'Leaks l/min - median', therapyLeaks[0]],
    ['1022', 'Leaks l/min - percentile 95', therapyLeaks[1]],
    ['1023', 'Leaks l/min - max', therapyLeaks[2]],
    ['1024', 'Events per hour - AI', eventsPerHour[0]],
    ['1025', 'Events per hour - HI', eventsPerHour[1]],
    ['1026', 'Events per hour - AHI', eventsPerHour[2]],
    ['1027', 'Apnoea Index - Central', apnoeaIndex[0]],
    ['1028', 'Apnoea Index - Obstructive', apnoeaIndex[1]],
    ['1029', 'Apnoea Index - Unknown', apnoeaIndex[2]],
    ['1030', 'Cheyne-Stokes respiration (average duration per night)', takeFirstAfter(labels.THERAPY_CHEYNE_STOKES_RESPIRATION)],
    ['1031', 'SpO2% - Time<88%', spo2Row.time],
    ['1032', 'SpO2% - Median', spo2Row.median],
    ['1033', 'SpO2% - percentile 95', spo2Row.fiftyNinthPercentile],
  ].map(([code, name, fn]) => ({ code, name, value: fn(items) }));
}

function parseComplianceReport(file) {
  return pdfJs.getDocument(file).promise
    .then(extractTextBlocks([1]))
    .then(sortItemsLeftToRight)
  // .then(attachLanguage)
    .then(extractRelevantData);
  // .then(validateExtractedData);
}

const complianceReportPdfHandler = genericPdfHandler(parseComplianceReport);

module.exports = {
  complianceReportPdfHandler,
};
