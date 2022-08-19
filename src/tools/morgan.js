const morgan = require('morgan');
const os = require('os');
const logger = require('./logger');

morgan.token('conversation-id', (req) => req.conversationId);
morgan.token('session-id', (req) => req.sessionId);
morgan.token('instance-id', (req) => req.instanceId);
morgan.token('hostname', () => os.hostname());
morgan.token('pid', () => process.pid);

const stream = {
  // Use the http severity
  write: (message) => {
    const content = JSON.parse(message);
    return logger.http(`${content.method} ${content.url}`, content);
  },
};

// Skip morgan logging if the specified log level is NOT debug or http
const skip = () => !['debug', 'http'].includes(process.env.LOG_LEVEL || 'info');

function jsonFormat(tokens, req, res) {
  return JSON.stringify({
    'remote-address': tokens['remote-addr'](req, res),
    // time: tokens.date(req, res, 'iso'),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    'http-version': tokens['http-version'](req, res),
    'status-code': tokens.status(req, res),
    'content-length': tokens.res(req, res, 'content-length'),
    referrer: tokens.referrer(req, res),
    'user-agent': tokens['user-agent'](req, res),
    'conversation-id': tokens['conversation-id'](req, res),
    'session-id': tokens['session-id'](req, res),
    hostname: tokens.hostname(req, res),
    instance: tokens['instance-id'](req, res),
    pid: tokens.pid(req, res),
  });
}

const morganMiddleware = morgan(
  jsonFormat,
  // Options: in this case, I overwrote the stream and the skip logic.
  // See the methods above.
  { stream, skip },
);

module.exports = morganMiddleware;
