// src/middleware/logging.middleware.js

const morgan = require('morgan');

// Skip noisy paths like health checks and static assets
function skip(req, res) {
  const url = req.originalUrl || '';
  if (url.startsWith('/health')) return true;
  if (url.startsWith('/favicon.ico')) return true;
  if (url.startsWith('/static/')) return true;
  return false;
}

// JSON format for production, dev-friendly for local
const isProd = process.env.NODE_ENV === 'production';

const jsonFormat = (tokens, req, res) => JSON.stringify({
  time: tokens['date'](req, res, 'iso'),
  method: tokens.method(req, res),
  url: tokens.url(req, res),
  status: Number(tokens.status(req, res)),
  content_length: tokens.res(req, res, 'content-length'),
  response_time_ms: Number(tokens['response-time'](req, res)),
  referrer: tokens.referrer(req, res) || undefined,
  agent: tokens['user-agent'](req, res)
});

const devFormat = 'dev';

const loggingMiddleware = morgan(isProd ? jsonFormat : devFormat, { skip });

module.exports = loggingMiddleware;

