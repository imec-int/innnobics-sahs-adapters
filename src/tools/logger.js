const winston = require('winston');

const format = winston.format.combine(
  winston.format.timestamp({ format: () => new Date().toISOString() }),
  winston.format.json(),
);

const transports = [
  new winston.transports.Console(),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format,
  transports,
});

module.exports = logger;
