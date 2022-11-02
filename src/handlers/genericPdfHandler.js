const R = require('ramda');
const fs = require('fs');

const os = require('os');
const path = require('path');
const crypto = require('crypto');
const logger = require('../tools/logger');

function tmpFile() {
  return path.join(os.tmpdir(), `upload.${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.pdf`);
}

function containsFile(req) {
  return req.files || req.body?.pdf;
}

const requestDoesNotContainFile = R.complement(containsFile);
const requestContainsPdfFile = (req) => req.files?.pdf;
const requestContainsBase64FileBody = (req) => req.body?.pdf;

function downloadBase64File(req) {
  const buffer = Buffer.from(req.body.pdf, 'base64');
  const tempPdfFilePath = tmpFile();

  logger.debug('Saving base64 uploaded pdf file to file path %s', tempPdfFilePath);

  fs.writeFileSync(tempPdfFilePath, buffer);
  return tempPdfFilePath;
}

function sendBadRequest(res) {
  return function send() {
    res.status(400).json({
      status: false,
      message: 'No file uploaded',
    });
  };
}

function sendResponse(res) {
  return function handleData(data) {
    if (data) {
      res.send({
        message: 'Data extracted successfully',
        data,
      });
    } else {
      res.status(400).send('Unable to extract relevant data');
    }
  };
}

function sendExceptionResponse(res) {
  return function handleError(err) {
    logger.error(err);
    res.status(500).send(err);
  };
}

const handlePdfFilePath = (parsePdfFile) => (res) => R.pipe(
  parsePdfFile,
  R.andThen(sendResponse(res)),
  R.otherwise(sendExceptionResponse(res)),
);

const handleBase64File = (parsePdfFile) => (res) => R.pipe(
  downloadBase64File,
  handlePdfFilePath(parsePdfFile)(res),
);

const extractPdfFile = (req) => R.path(['files', 'pdf'])(req);

const handlePdfFile = (parsePdfFile) => (res) => R.pipe(
  extractPdfFile,
  handlePdfFilePath(parsePdfFile)(res),
);

const genericPdfHandler = (pdfFileParser) => {
  const fileHandler = handlePdfFile(pdfFileParser);
  const base64Handler = handleBase64File(pdfFileParser);

  return async (req, res) => {
    R.cond([
      [requestDoesNotContainFile, sendBadRequest(res)],
      [requestContainsPdfFile, fileHandler(res)],
      [requestContainsBase64FileBody, base64Handler(res)],
    ])(req);
  };
};

module.exports = {
  genericPdfHandler,
};
