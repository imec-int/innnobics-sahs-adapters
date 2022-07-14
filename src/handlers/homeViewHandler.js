const { parsePdfFile } = require('./pdfHandler');

const post = (req, res) => {
  if (!req.files) {
    res.status(400);
  } else {
    const { pdf } = req.files;
    parsePdfFile(pdf).then((data) => {
      res.status(200).render('index', { values: data, filename: pdf.name });
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
