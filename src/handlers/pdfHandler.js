const R = require('ramda');

const pdfJs = require('pdfjs-dist/legacy/build/pdf.js');

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

const horizontalRowField = (blockTitle, nextBlockTitle) => {
  let block; // can be reused once the items are received
  return R.curry((label, items) => {
    block = block || extractHorizontalFields(blockTitle, nextBlockTitle)(items);
    return block[label];
  });
};

const recording = horizontalRowField('Recording', 'Monitoring time (flow)');
const monitoringTime = horizontalRowField('Monitoring time (flow)', 'Oxygen saturation evaluation');
const oxygenSaturation = horizontalRowField('Oxygen saturation evaluation', 'Statistics');
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
const analysisGuidelines = horizontalRowField('Pulse - bpm', 'Analysis guidelines:');

const PATIENT_ID_INDEX = 8;
const PATIENT_ID_CODE = '0003';

const extractRelevantData = async (items) => [
  template('0001', 'Date', takeStr(0)),
  template('0002', 'Type', takeStr(1)),
  template(PATIENT_ID_CODE, 'Patient ID', takeSecondPartOfString(PATIENT_ID_INDEX)),
  template('0004', 'DOB', takeSecondPartOfString(9)),
  template('0005', 'Age', takeSecondPartOfString(10)),
  template('0006', 'Gender', takeSecondPartOfString(11)),
  template('0007', 'BMI', takeSecondPartOfString(12)),
  template('0008', 'Recording details', takeStr(18)),
  template('0009', 'Device', takeStr(21)),
  template('0100', 'Recording Start', recording('Start')),
  template('0101', 'Recording End', recording('End')),
  template('0102', 'Recording Duration - hr', mapDuration(recording('Duration - hr'))),
  template('0201', 'Monitoring time (flow) Start ', monitoringTime('Start')),
  template('0202', 'Monitoring time (flow) End ', monitoringTime('End')),
  template('0203', 'Monitoring time (flow) Duration - hr', mapDuration(monitoringTime('Duration - hr'))),
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
  template('1401', 'Pulse - bpm Min', analysisGuidelines('Min')),
  template('1402', 'Pulse - bpm Avg', analysisGuidelines('Avg')),
  template('1403', 'Pulse - bpm Max', analysisGuidelines('Max')),
  template('1500', 'Analysis guidelines', takeStr(228)),
  template('1600', 'Adicional data', concatUntilEndOfPage(229)),
  template('1700', 'Interpretation', concatUntilEndOfPage(249)),
].map((fn) => fn(items));

const extractTextContent = async (doc) => {
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
  // if the patient ID code could not be extracted, this
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
      console.error(err);
      res.status(500).send(err);
    });
  }
};

module.exports = { pdfHandler, parsePdfFile };
