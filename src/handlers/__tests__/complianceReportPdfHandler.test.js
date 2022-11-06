const express = require('express');
const supertest = require('supertest');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { complianceReportPdfHandler } = require('../complianceReportPdfHandler');

const URL = '/api/compliance-report';
const app = express();
app.use(fileUpload({
  createParentPath: true,
}));
app.post(URL, complianceReportPdfHandler);

describe('Not uploading a PDF file', () => {
  it('should return a http status 400', async () => {
    const response = await supertest(app).post(URL);

    expect(response.status).toEqual(400);
    expect(response.body).toEqual({ status: false, message: 'No file uploaded' });
  });
});

describe('Handling an English file', () => {
  const expectedEnglishPdfFieldValues = [
    { code: '1001', description: 'Date', value: '11/09/2022 - 10/10/2022' },
    { code: '1002', description: 'Patient ID', value: '00772500096' },
    { code: '1003', description: 'DOB', value: '20/10/1989' },
    { code: '1004', description: 'Age', value: '32' },
    { code: '1005', description: 'Gender', value: 'Male' },
    { code: '1006', description: 'Usage days', value: '7/30 days (23%)' },
    { code: '1007', description: '>= 4 hours', value: '7 days (23%)' },
    { code: '1008', description: '< 4 hours', value: '0 days (0%)' },
    { code: '1009', description: 'Average usage (total days)', value: '1 hours 24 minutes' },
    { code: '1010', description: 'Average usage (days used)', value: '6 hours 0 minutes' },
    { code: '1011', description: 'Median usage (days used)', value: '6 hours 44 minutes' },
    { code: '1012', description: 'Serial number', value: '00772500096' },
    { code: '1013', description: 'Mode', value: 'AutoSet' },
    { code: '1014', description: 'Min Pressure', value: '5.2 cmH2O' },
    { code: '1015', description: 'Max Pressure', value: '20 cmH2O' },
    { code: '1016', description: 'EPR level', value: '3' },
    { code: '1017', description: 'Response', value: 'Soft' },
    { code: '1018', description: 'Pressure -cm H2O - median', value: '9.4' },
    { code: '1019', description: 'Pressure -cm H2O - percentile 95', value: '10.8' },
    { code: '1020', description: 'Pressure -cm H2O - max', value: '11.3' },
    { code: '1021', description: 'Leaks l/min - median', value: '0.0' },
    { code: '1022', description: 'Leaks l/min - percentile 95', value: '29.1' },
    { code: '1023', description: 'Leaks l/min - max', value: '45.4' },
    { code: '1024', description: 'Events per hour - AI', value: '7.3' },
    { code: '1025', description: 'Events per hour - HI', value: '0.0' },
    { code: '1026', description: 'Events per hour - AHI', value: '7.3' },
    { code: '1027', description: 'Apnoea Index - Central', value: '5.5' },
    { code: '1028', description: 'Apnoea Index - Obstructive', value: '1.4' },
    { code: '1029', description: 'Apnoea Index - Unknown', value: '0.4' },
    { code: '1030', description: 'Cheyne-Stokes respiration (average duration per night)', value: '20 minutes (6%)' },
    { code: '1031', description: 'SpO2% - Time<88%', value: '18 min' },
    { code: '1032', description: 'SpO2% - Median', value: '92' },
    { code: '1033', description: 'SpO2% - percentile 95', value: '96' },
  ];

  describe('Sending the english file as part of multipart formdata', () => {
    const SAMPLE_PDF = path.join(__dirname, 'compliance-report-english.pdf');

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
    const SAMPLE_PDF = path.join(__dirname, 'compliance-report-english.pdf');
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
});

describe('Handling a Portugese file', () => {
  const expectedFieldValues = [
    { code: '1001', description: 'Date', value: '11/09/2022 - 10/10/2022' },
    { code: '1002', description: 'Patient ID', value: '00772500018' },
    { code: '1003', description: 'DOB', value: '20/10/1966' },
    { code: '1004', description: 'Age', value: '55' },
    { code: '1005', description: 'Gender', value: 'Male' },
    { code: '1006', description: 'Usage days', value: '21/30 dias (70%)' },
    { code: '1007', description: '>= 4 hours', value: '2 dias (7%)' },
    { code: '1008', description: '< 4 hours', value: '19 dias (63%)' },
    { code: '1009', description: 'Average usage (total days)', value: '2 horas 5 minutos' },
    { code: '1010', description: 'Average usage (days used)', value: '2 horas 58 minutos' },
    { code: '1011', description: 'Median usage (days used)', value: '2 horas 55 minutos' },
    { code: '1012', description: 'Serial number', value: '00772500018' },
    { code: '1013', description: 'Mode', value: 'AutoSet' },
    { code: '1014', description: 'Min Pressure', value: '5.2 cmH2O' },
    { code: '1015', description: 'Max Pressure', value: '20 cmH2O' },
    { code: '1016', description: 'EPR level', value: '3' },
    { code: '1017', description: 'Response', value: 'Macio' },
    { code: '1018', description: 'Pressure -cm H2O - median', value: '9.4' },
    { code: '1019', description: 'Pressure -cm H2O - percentile 95', value: '10.8' },
    { code: '1020', description: 'Pressure -cm H2O - max', value: '11.4' },
    { code: '1021', description: 'Leaks l/min - median', value: '0.0' },
    { code: '1022', description: 'Leaks l/min - percentile 95', value: '4.3' },
    { code: '1023', description: 'Leaks l/min - max', value: '24.3' },
    { code: '1024', description: 'Events per hour - AI', value: '7.5' },
    { code: '1025', description: 'Events per hour - HI', value: '0.0' },
    { code: '1026', description: 'Events per hour - AHI', value: '7.5' },
    { code: '1027', description: 'Apnoea Index - Central', value: '5.7' },
    { code: '1028', description: 'Apnoea Index - Obstructive', value: '1.4' },
    { code: '1029', description: 'Apnoea Index - Unknown', value: '0.4' },
    { code: '1030', description: 'Cheyne-Stokes respiration (average duration per night)', value: '20 minutos (12%)' },
    { code: '1031', description: 'SpO2% - Time<88%', value: '18 min' },
    { code: '1032', description: 'SpO2% - Median', value: '92' },
    { code: '1033', description: 'SpO2% - percentile 95', value: '96' },
  ];

  describe('Sending the file as part of multipart formdata', () => {
    const SAMPLE_PDF = path.join(__dirname, 'compliance-report-portuguese.pdf');

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
