const express = require('express');
const supertest = require('supertest');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { pdfHandler, findDate } = require('./pdfHandler.js');
const { findType } = require('./pdfHandler');

const URL = '/api/pdf';
const app = express();
app.use(fileUpload({
  createParentPath: true,
}));
app.post(URL, pdfHandler);

describe('Not uploading a PDF file', () => {
  it('should return a http status 400', async () => {
    const response = await supertest(app).post(URL);

    expect(response.status).toEqual(400);
    expect(response.body).toEqual({ status: false, message: 'No file uploaded' });
  });
});

describe('Handling an English file', () => {
  const expectedEnglishPdfFieldValues = [
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
    { code: '0204', description: 'Flow evaluation Start', value: undefined },
    { code: '0205', description: 'Flow evaluation End', value: undefined },
    { code: '0206', description: 'Flow evaluation Duration - hr', value: undefined },
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
    {
      code: '1600',
      description: 'Adicional data',
      value: 'Apnea[10%; 10s; 80s; 1.0s; 20%; 60%; 8%]; Hypopnea[70%; 10s; 100s; 1.0s]; Snoring[6.0%; 0.3s, 3.5s; 0.5s]; Desaturation[3.0%]; CSR[0.5]. Airflow sensor and respiratory effort sensor: Pressure transducer. Hypopneas were scored only if there was valid oximetry data.',
    },
    {
      code: '1700',
      description: 'Interpretation',
      value: 'This patient needs ongoing therapy. Electronically signed by Dr Alexis Physician, NPI eco_doc@resmed.fr123 28/04/2022 10:36pm (+01:00)',
    },
  ];

  describe('Sending the english file as part of multipart formdata', () => {
    const SAMPLE_PDF = path.join(__dirname, 'report-en.pdf');

    let response;

    beforeAll(async () => {
      response = await supertest(app)
        .post(URL)
        .attach('pdf', SAMPLE_PDF);
    });

    it('should return a http status 200', async () => {
      expect(response.status).toBe(200);
    });

    test.each(expectedEnglishPdfFieldValues)('should contain the value for code %p', ({ code, description, value }) => {
      const entry = response.body?.data?.find((e) => e.code === code);

      expect(entry).toBeDefined();
      expect(entry.code).toBe(code);
      expect(entry.name).toBe(description);
      expect(entry.value).toBe(value);
    });
  });

  describe('Sending the file as a BASE64 encoded string', () => {
    const SAMPLE_PDF = path.join(__dirname, 'report-en.pdf');
    const base64 = fs.readFileSync(SAMPLE_PDF, { encoding: 'base64' });

    let response;

    beforeAll(async () => {
      response = await supertest(app)
        .post(URL)
        .field('pdf', base64);
    });

    it('should return a http status 200', async () => {
      expect(response.status).toBe(200);
    });

    test.each(expectedEnglishPdfFieldValues)('should contain the value for code %p', async ({
      code,
      description,
      value,
    }) => {
      const entry = response.body?.data?.find((e) => e.code === code);

      expect(entry).toBeDefined();
      expect(entry.code).toBe(code);
      expect(entry.name).toBe(description);
      expect(entry.value).toBe(value);
    });
  });

  describe('Upload valid, unsigned file', () => {
    const UNSIGNED_PDF = path.join(__dirname, 'Diagnostic_report_20220429_041628.pdf');

    let unsignedResponse;

    beforeAll(async () => {
      unsignedResponse = await supertest(app)
        .post(URL)
        .attach('pdf', UNSIGNED_PDF);
    });

    const unsignedTestCases = [
      { code: '0002', description: 'Type', value: 'Complex, Fieldman' },
      { code: '0008', description: 'Recording details', value: '25/07/2013' },
      { code: '0201', description: 'Monitoring time (flow) Start ', value: undefined },
      { code: '0202', description: 'Monitoring time (flow) End ', value: undefined },
      { code: '0203', description: 'Monitoring time (flow) Duration - hr', value: undefined },
      { code: '0204', description: 'Flow evaluation Start', value: '10:37pm' },
      { code: '0205', description: 'Flow evaluation End', value: '6:08am' },
      { code: '0206', description: 'Flow evaluation Duration - hr', value: '06:44' },
    ];

    test.each(unsignedTestCases)('should contain the value for code %p', ({ code, description, value }) => {
      const entry = unsignedResponse.body?.data?.find((e) => e.code === code);

      expect(entry).toBeDefined();
      expect(entry.code).toBe(code);
      expect(entry.name).toBe(description);
      expect(entry.value).toBe(value);
    });
  });
});

describe('Handling a Portugese file', () => {
  const expectedFieldValues = [
    { code: '0001', description: 'Date', value: '26/10/2015' },
    { code: '0002', description: 'Type', value: 'Gordon, Suzanne' },
    { code: '0003', description: 'Patient ID', value: '' },
    { code: '0004', description: 'DOB', value: '04/04/1983' },
    { code: '0005', description: 'Age', value: '39' },
    { code: '0006', description: 'Gender', value: 'Female' },
    { code: '0007', description: 'BMI', value: '27.3' },
    { code: '0008', description: 'Recording details', value: '26/10/2015' },
    { code: '0009', description: 'Device', value: 'ApneaLink Air' },
    { code: '0100', description: 'Recording Start', value: '11:49pm' },
    { code: '0101', description: 'Recording End', value: '5:26am' },
    { code: '0102', description: 'Recording Duration - hr', value: '05:37' },
    { code: '0201', description: 'Monitoring time (flow) Start ', value: '1:37am' },
    { code: '0202', description: 'Monitoring time (flow) End ', value: '5:24am' },
    { code: '0203', description: 'Monitoring time (flow) Duration - hr', value: '02:51' },
    { code: '0204', description: 'Flow evaluation Start', value: undefined },
    { code: '0205', description: 'Flow evaluation End', value: undefined },
    { code: '0206', description: 'Flow evaluation Duration - hr', value: undefined },
    { code: '0301', description: 'Oxygen saturation evaluation Start ', value: '11:59pm' },
    { code: '0302', description: 'Oxygen saturation evaluation End ', value: '5:26am' },
    { code: '0303', description: 'Oxygen saturation evaluation Duration - hr', value: '05:26' },
    { code: '0401', description: 'Events index REI (AHI)', value: '2.4' },
    { code: '0402', description: 'Events index AI', value: '0.0' },
    { code: '0403', description: 'Events index HI', value: '2.4' },
    { code: '0501', description: 'Supine Time-hr', value: '01:04' },
    { code: '0502', description: 'Supine Percentage', value: '37.7' },
    { code: '0503', description: 'Supine REI (AHI)', value: '1.4' },
    { code: '0504', description: 'Supine AI', value: '0.0' },
    { code: '0505', description: 'Supine HI', value: '1.4' },
    { code: '0601', description: 'Non-supine Time-hr', value: '01:47' },
    { code: '0602', description: 'Non-supine Percentage', value: '62.3' },
    { code: '0603', description: 'Non-supine REI (AHI)', value: '1.0' },
    { code: '0604', description: 'Non-supine AI', value: '0.0' },
    { code: '0605', description: 'Non-supine HI', value: '1.0' },
    { code: '0701', description: 'Upright Time-hr', value: '00:00' },
    { code: '0702', description: 'Upright Percentage', value: '0.0' },
    { code: '0703', description: 'Upright REI (AHI)', value: '0.0' },
    { code: '0704', description: 'Upright AI', value: '0.0' },
    { code: '0705', description: 'Upright HI', value: '0.0' },
    { code: '0801', description: 'Events totals Apneas:', value: '0' },
    { code: '0802', description: 'Events totals Hypopneas:', value: '7' },
    { code: '0901', description: 'Apnea Index Obstructive:', value: '0.0' },
    { code: '0902', description: 'Apnea Index Central:', value: '0.0' },
    { code: '0903', description: 'Apnea Index Mixed:', value: '0.0' },
    { code: '0904', description: 'Apnea Index Unclassified:', value: '0.0' },
    { code: '1001', description: 'Cheyne-Stokes respiration Time - hr: ', value: '00:00' },
    { code: '1002', description: 'Cheyne-Stokes respiration Percentage', value: '0' },
    { code: '1101', description: 'Oxygen desaturation ODI', value: '2.4' },
    { code: '1102', description: 'Oxygen desaturation Total', value: '13' },
    { code: '1201', description: 'Oxygen saturation % Baseline', value: '95' },
    { code: '1202', description: 'Oxygen saturation % Avg', value: '94' },
    { code: '1203', description: 'Oxygen saturation % Lowest', value: '80' },
    { code: '1204', description: 'Oxygen saturation - eval time % <=90%sat', value: '0' },
    { code: '1205', description: 'Oxygen saturation - eval time % <=85%sat:', value: '0' },
    { code: '1206', description: 'Oxygen saturation - eval time % <=80%sat', value: '0' },
    { code: '1207', description: 'Oxygen saturation - eval time % <=88%sat', value: '0' },
    { code: '1208', description: 'Oxygen saturation - eval time % <=88%Time - hr:', value: '00:00' },
    { code: '1301', description: 'Breaths Total', value: '2358' },
    { code: '1302', description: 'Breaths Avg/min', value: '13.7' },
    { code: '1303', description: 'Breaths Snores', value: '65' },
    { code: '1401', description: 'Pulse - bpm Min', value: '49' },
    { code: '1402', description: 'Pulse - bpm Avg', value: '61' },
    { code: '1403', description: 'Pulse - bpm Max', value: '93' },
    { code: '1500', description: 'Analysis guidelines', value: 'AASM 2012, Classificação automática' },
    {
      code: '1600',
      description: 'Adicional data',
      value: 'Apneia[10%; 10 s; 80 s; 1,0 s; 20%; 60%; 8%]; Hipopneia[70%; 10 s; 100 s; 1,0 s]; '
          + 'Ressonar[6,0%; 0,3 s, 3,5 s; 0,5 s]; Dessaturação[3,0%]; CSR[0,5]. Sensor Airflow e sensor de '
          + 'esforço respiratório: Transdutor de pressão. As hipopneias foram classificadas apenas se tiver '
          + 'havido dados de oximetria válidos.',
    },
    { code: '1700', description: 'Interpretation', value: 'OK Test positf' },
  ];

  describe('Sending the file as part of multipart formdata', () => {
    const SAMPLE_PDF = path.join(__dirname, 'report-portugese.pdf');

    let response;

    beforeAll(async () => {
      response = await supertest(app)
        .post(URL)
        .attach('pdf', SAMPLE_PDF);
    });

    it('should return a http status 200', async () => {
      expect(response.status).toBe(200);
    });

    test.each(expectedFieldValues)('should contain the value for code %p', ({ code, description, value }) => {
      const entry = response.body?.data?.find((e) => e.code === code);

      expect(entry).toBeDefined();
      expect(entry.code).toBe(code);
      expect(entry.name).toBe(description);
      expect(entry.value).toBe(value);
    });
  });
});

describe('Gender should be translated to the english word', () => {
  it('should translate portugese', async () => {
    const SAMPLE_PDF = path.join(__dirname, 'report-portugese.pdf');
    const response = await supertest(app)
      .post(URL)
      .attach('pdf', SAMPLE_PDF);

    const gender = response.body?.data?.find((e) => e.code === '0006');

    expect(gender).toBeDefined();
    expect(gender.value).toBe('Female');
  });
});

describe('Uploading a bogus PDF file', () => {
  test('should respond with a HTTP status 400', async () => {
    // given
    const WRONG_PDF = path.join(__dirname, 'bogus.pdf');

    // when
    const response = await supertest(app)
      .post(URL)
      .attach('pdf', WRONG_PDF);

    // then
    expect(response.status).toBe(400);
  });
});

describe('Find specific fields on PDF', () => {
  const sortedItems = [
    {
      str: '25/07/2013',
      dir: 'ltr',
      width: 59.510000000000005,
      height: 11,
      transform: [
        11,
        0,
        0,
        11,
        470.49,
        754.6,
      ],
      fontName: 'g_d0_f1',
      hasEOL: true,
      page: 1,
    },
    {
      str: 'Physician Practice',
      dir: 'ltr',
      width: 49.104,
      height: 6,
      transform: [
        6,
        0,
        0,
        6,
        130,
        750.67,
      ],
      fontName: 'g_d0_f2',
      hasEOL: true,
      page: 1,
    },
    {
      str: '7166 Time Tunnel',
      dir: 'ltr',
      width: 48.60600000000001,
      height: 6,
      transform: [
        6,
        0,
        0,
        6,
        130,
        742.23,
      ],
      fontName: 'g_d0_f2',
      hasEOL: true,
      page: 1,
    },
    {
      str: 'Complex, Hunter',
      dir: 'ltr',
      width: 87.10900000000002,
      height: 11,
      transform: [
        11,
        0,
        0,
        11,
        442.89,
        737.54,
      ],
      fontName: 'g_d0_f1',
      hasEOL: false,
      page: 1,
    },
    {
      str: 'Portchester, Ain 73501',
      dir: 'ltr',
      width: 62.022000000000034,
      height: 6,
      transform: [
        6,
        0,
        0,
        6,
        130,
        733.78,
      ],
      fontName: 'g_d0_f2',
      hasEOL: true,
      page: 1,
    },
    {
      str: 'Phone: 547-504-3958',
      dir: 'ltr',
      width: 59.96400000000001,
      height: 6,
      transform: [
        6,
        0,
        0,
        6,
        130,
        705.67,
      ],
      fontName: 'g_d0_f2',
      hasEOL: true,
      page: 1,
    },
    {
      str: 'Patient ID: 123455',
      dir: 'ltr',
      width: 74.64599999999997,
      height: 9,
      transform: [
        9,
        0,
        0,
        9,
        455.35,
        703.51,
      ],
      fontName: 'g_d0_f2',
      hasEOL: true,
      page: 1,
    },
    {
      str: 'Fax: (487)901-9561',
      dir: 'ltr',
      width: 52.81200000000001,
      height: 6,
      transform: [
        6,
        0,
        0,
        6,
        130,
        697.23,
      ],
      fontName: 'g_d0_f2',
      hasEOL: true,
      page: 1,
    },
    {
      str: 'DOB: 15/12/1922',
      dir: 'ltr',
      width: 70.47899999999998,
      height: 9,
      transform: [
        9,
        0,
        0,
        9,
        459.52,
        690.84,
      ],
      fontName: 'g_d0_f2',
      hasEOL: true,
      page: 1,
    },
    {
      str: 'Email: admin@primary.com',
      dir: 'ltr',
      width: 73.476,
      height: 6,
      transform: [
        6,
        0,
        0,
        6,
        130,
        688.78,
      ],
      fontName: 'g_d0_f2',
      hasEOL: false,
      page: 1,
    },
    {
      str: 'Age: 99',
      dir: 'ltr',
      width: 30.626999999999995,
      height: 9,
      transform: [
        9,
        0,
        0,
        9,
        499.37,
        678.17,
      ],
      fontName: 'g_d0_f2',
      hasEOL: true,
      page: 1,
    },
    {
      str: 'Gender: Male',
      dir: 'ltr',
      width: 53.75699999999999,
      height: 9,
      transform: [
        9,
        0,
        0,
        9,
        476.24,
        665.5,
      ],
      fontName: 'g_d0_f2',
      hasEOL: true,
      page: 1,
    },
    {
      str: 'BMI: 24.2',
      dir: 'ltr',
      width: 38.00700000000005,
      height: 9,
      transform: [
        9,
        0,
        0,
        9,
        491.99,
        652.83,
      ],
      fontName: 'g_d0_f2',
      hasEOL: false,
      page: 1,
    },
    {
      str: 'Diagnostic Report',
      dir: 'ltr',
      width: 143.874,
      height: 18,
      transform: [
        18,
        0,
        0,
        18,
        130,
        630.02,
      ],
      fontName: 'g_d0_f2',
      hasEOL: false,
      page: 1,
    },
  ];

  it('should find the date in the top right corner', () => {
    // given items sorted by page, left to right, top to bottom
    // when looking for the date
    const result = findDate(sortedItems);

    // expect it to match
    expect(result).toEqual('25/07/2013');
  });

  it('should find the type in the top right corner below the date', () => {
    // given items sorted by page, left to right, top to bottom
    // when looking for the date
    const result = findType(sortedItems);

    // expect it to match
    expect(result).toEqual('Complex, Hunter');
  });
});
