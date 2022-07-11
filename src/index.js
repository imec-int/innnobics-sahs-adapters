const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const cors = require('cors');
const express = require('express');
const { engine } = require('express-handlebars');
const Routes = require('./handlers/routes.js');
const { parsePdfFile, pdfHandler } = require('./handlers/pdfHandler');

const app = express();

// enable files upload
app.use(fileUpload({
  createParentPath: true,
}));

app.use(cors());
app.use(morgan('dev')); // logging HTTP call

// endpoints
app.post(Routes.PARSE_PDF, pdfHandler);

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.get('/', async (req, res) => {
  res.render('index');
});

app.post('/', async (req, res) => {
  const { pdf } = req.files;
  const data = await parsePdfFile(pdf);

  res.status(200).render('index', { values: data, filename: pdf.name });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`App is listening on port ${port}.`));
