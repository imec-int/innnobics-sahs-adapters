const fileUpload = require('express-fileupload');
const cors = require('cors');
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const { diagnosticReportPdfHandler } = require('./handlers/diagnosticReportPdfHandler');
const homeViewHandler = require('./handlers/homeViewHandler');
const morganMiddleware = require('./tools/morgan');
const logger = require('./tools/logger');
const { complianceReportPdfHandler } = require('./handlers/complianceReportPdfHandler');

/** *****************
 * Express setup
 ****************** */
const app = express();
app.use(fileUpload());
app.use(cors());
app.use(morganMiddleware); // logging HTTP calls
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

app.post(['/api/pdf'], diagnosticReportPdfHandler);
app.post(['/api/diagnostic-report'], diagnosticReportPdfHandler);
app.post(['/api/compliance-report'], complianceReportPdfHandler);

app.get('/', homeViewHandler.get);
app.post('/', homeViewHandler.post);

const port = process.env.PORT || 8080;
app.listen(port, () => logger.info(`App is listening on port ${port}.`));
