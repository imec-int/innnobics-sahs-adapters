const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const cors = require('cors');
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const { pdfHandler } = require('./handlers/pdfHandler');
const homeViewHandler = require('./handlers/homeViewHandler');

/** *****************
 * Express setup
 ****************** */
const app = express();
app.use(fileUpload());
app.use(cors());
app.use(morgan('dev')); // logging HTTP call
app.use(
  '/api/docs',
  swaggerUi.serve, // enable swagger documentation
  swaggerUi.setup(require('./swagger.json')),
); 
app.use(express.static(path.join(__dirname, '..', 'public')));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', (path.join(__dirname, './views')));

/** *****************
 * Endpoint
 ****************** */

app.post('/api/pdf', pdfHandler);

app.get('/', homeViewHandler.get);
app.post('/', homeViewHandler.post);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`App is listening on port ${port}.`));
