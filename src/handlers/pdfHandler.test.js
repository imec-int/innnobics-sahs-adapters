const express = require('express');
const supertest = require('supertest');
const fileUpload = require('express-fileupload');
const path = require('path');
const Routes = require('./routes.js');
const { pdfHandler } = require('./pdfHandler.js');

const app = express();
app.use(fileUpload({
  createParentPath: true,
}));
app.post(Routes.PARSE_PDF, pdfHandler);

describe('Not uploading a PDF file', () => {
  it('should return a http status 400', async () => {
    const response = await supertest(app).post(Routes.PARSE_PDF);

    expect(response.status).toEqual(400);
    expect(response.body).toEqual({ status: false, message: 'No file uploaded' });
  });
});

describe('Uploading a valid file', () => {
  const SAMPLE_PDF = path.join(__dirname, 'report1.pdf');

  let response;

  beforeAll(async () => {
    response = await supertest(app)
      .post(Routes.PARSE_PDF)
      .attach('pdf', SAMPLE_PDF);
  });

  it('should return a http status 200', async () => {
    expect(response.status).toBe(200);
  });

  const testCases = [
    { code: '0001', description: 'Date', value: '25/07/2013' },
    { code: '0002', description: 'Type', value: 'Complex, Hunter' },
    { code: '0003', description: 'Patient ID', value: '123455' },
    { code: '0004', description: 'DOB', value: '15/12/1922' },
    { code: '0005', description: 'Age', value: '99' },
    { code: '0006', description: 'Gender', value: 'Male' },
    { code: '0007', description: 'BMI', value: '24.2' },
    { code: '0008', description: 'Recording details', value: '25/07/2013' },
    { code: '0009', description: 'Device', value: 'ApneaLink Air' },
    { code: '0100', description: 'Recording Start', value: '10:27pm' },
    { code: '0101', description: 'Recording End', value: '6:10am' },
    { code: '0102', description: 'Recording Duration - hr', value: '07:42' },
    { code: '0201', description: 'Monitoring time (flow) Start ', value: '10:37pm' },
    { code: '0202', description: 'Monitoring time (flow) End ', value: '6:08am' },
    { code: '0203', description: 'Monitoring time (flow) Duration - hr', value: '06:44' },
    { code: '0301', description: 'Oxygen saturation evaluation Start ', value: '10:37pm' },
    { code: '0302', description: 'Oxygen saturation evaluation End ', value: '6:10am' },
    { code: '0303', description: 'Oxygen saturation evaluation Duration - hr', value: '07:32' },
    { code: '0401', description: 'Events index REI (AHI)', value: '34.5' },
    { code: '0402', description: 'Events index AI', value: '16.9' },
    { code: '0403', description: 'Events index HI', value: '17.6' },
    { code: '0501', description: 'Supine Time-hr', value: '06:44' },
    { code: '0502', description: 'Supine Percentage', value: '100.0' },
    { code: '0503', description: 'Supine REI (AHI)', value: '34.5' },
    { code: '0504', description: 'Supine AI', value: '16.9' },
    { code: '0505', description: 'Supine HI', value: '17.6' },
    { code: '0601', description: 'Non-supine Time-hr', value: '00:00' },
    { code: '0602', description: 'Non-supine Percentage', value: '0.0' },
    { code: '0603', description: 'Non-supine REI (AHI)', value: '0.0' },
    { code: '0604', description: 'Non-supine AI', value: '0.0' },
    { code: '0605', description: 'Non-supine HI', value: '0.0' },
    { code: '0701', description: 'Upright Time-hr', value: '00:00' },
    { code: '0702', description: 'Upright Percentage', value: '0.0' },
    { code: '0703', description: 'Upright REI (AHI)', value: '0.0' },
    { code: '0704', description: 'Upright AI', value: '0.0' },
    { code: '0705', description: 'Upright HI', value: '0.0' },
    { code: '0801', description: 'Events totals Apneas:', value: '114' },
    { code: '0802', description: 'Events totals Hypopneas:', value: '119' },
    { code: '0901', description: 'Apnea Index Obstructive:', value: '5.8' },
    { code: '0902', description: 'Apnea Index Central:', value: '10.2' },
    { code: '0903', description: 'Apnea Index Mixed:', value: '0.9' },
    { code: '0904', description: 'Apnea Index Unclassified:', value: '0.0' },
    { code: '1001', description: 'Cheyne-Stokes respiration Time - hr: ', value: '00:00' },
    { code: '1002', description: 'Cheyne-Stokes respiration Percentage', value: '0' },
    { code: '1101', description: 'Oxygen desaturation ODI', value: '31.5' },
    { code: '1102', description: 'Oxygen desaturation Total', value: '238' },
    { code: '1201', description: 'Oxygen saturation % Baseline', value: '95' },
    { code: '1202', description: 'Oxygen saturation % Avg', value: '94' },
    { code: '1203', description: 'Oxygen saturation % Lowest', value: '87' },
    { code: '1204', description: 'Oxygen saturation - eval time % <=90%sat', value: '2' },
    { code: '1205', description: 'Oxygen saturation - eval time % <=85%sat:', value: '0' },
    { code: '1206', description: 'Oxygen saturation - eval time % <=80%sat', value: '0' },
    { code: '1207', description: 'Oxygen saturation - eval time % <=88%sat', value: '0' },
    { code: '1208', description: 'Oxygen saturation - eval time % <=88%Time - hr:', value: '00:00' },
    { code: '1301', description: 'Breaths Total', value: '4209' },
    { code: '1302', description: 'Breaths Avg/min', value: '10.4' },
    { code: '1303', description: 'Breaths Snores', value: '1263' },
    { code: '1401', description: 'Pulse - bpm Min', value: '49' },
    { code: '1402', description: 'Pulse - bpm Avg', value: '61' },
    { code: '1403', description: 'Pulse - bpm Max', value: '93' },
    { code: '1500', description: 'Analysis guidelines', value: 'AASM 2012, Automatic scoring' },
    { code: '1600', description: 'Adicional data', value: 'Apnea[10%; 10s; 80s; 1.0s; 20%; 60%; 8%]; Hypopnea[70%; 10s; 100s; 1.0s]; Snoring[6.0%; 0.3s, 3.5s; 0.5s]; Desaturation[3.0%]; CSR[0.5]. Airflow sensor and respiratory effort sensor: Pressure transducer. Hypopneas were scored only if there was valid oximetry data.' },
    { code: '1700', description: 'Interpretation', value: 'This patient needs ongoing therapy. Electronically signed by Dr Alexis Physician, NPI eco_doc@resmed.fr123 28/04/2022 10:36pm (+01:00)' },
  ];

  test.each(testCases)('should contain the value for code %p', ({ code, description, value }) => {
    const entry = response.body?.data?.find((e) => e.code === code);

    expect(entry).toBeDefined();
    expect(entry.code).toBe(code);
    expect(entry.name).toBe(description);
    expect(entry.value).toBe(value);
  });
});
