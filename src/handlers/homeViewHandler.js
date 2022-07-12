const { parsePdfFile } = require('./pdfHandler');

const post = async (req, res) => {
  const { pdf } = req.files;
  const data = await parsePdfFile(pdf);

  res.status(200).render('index', { values: data, filename: pdf.name });
};

const get = async (req, res) => {
  res.render('index');
};

const homeViewHandler = {
  get, post,
};

module.exports = homeViewHandler;
