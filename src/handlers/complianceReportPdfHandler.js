const { genericPdfHandler } = require('./genericPdfHandler');

function parseComplianceReport() {
  return Promise.resolve({ status: 'OK' });
}

const complianceReportPdfHandler = genericPdfHandler(parseComplianceReport);

module.exports = {
  complianceReportPdfHandler,
};
