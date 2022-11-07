const { parseDiagnosticReportPdfFile } = require('./diagnosticReportPdfHandler');
const { parseComplianceReport } = require('./complianceReportPdfHandler');

function chooseParser(typeOfReport) {
  switch (typeOfReport) {
    case 'complianceReport':
      return parseComplianceReport;
    case 'diagnosticReport':
    default:
      return parseDiagnosticReportPdfFile;
  }
}

const post = (req, res) => {
  if (!req.files) {
    res.status(400);
  } else {
    const { pdf } = req.files;
    const { typeOfReport } = req.body;
    const parser = chooseParser(typeOfReport);
    parser(pdf).then((data) => {
      if (data) {
        res.status(200).render('index', { values: data, filename: pdf.name });
      } else {
        res.status(500).render('index', { error: 'Something went wrong. Are you sure this is a valid PDF of the specified type?' });
      }
    }).catch(() => {
      res.status(500).render('index', { error: 'Something went wrong. Are you sure this is a valid PDF?' });
    });
  }
};

const get = async (req, res) => {
  res.render('index');
};

const homeViewHandler = {
  get, post,
};

module.exports = homeViewHandler;
