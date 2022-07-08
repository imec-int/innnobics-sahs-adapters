const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const cors = require('cors');
const express = require('express');
const pdfHandler = require('./handlers/pdfHandler.js');
const Routes = require('./handlers/routes.js');

const app = express();

// enable files upload
app.use(fileUpload({
  createParentPath: true,
}));

app.use(cors());
app.use(morgan('dev')); // logging HTTP call

// endpoints
app.post(Routes.PARSE_PDF, pdfHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App is listening on port ${port}.`));
