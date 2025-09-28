// src/middleware/error.middleware.js

const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Error middleware caught error', {
    status,
    message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(status).json({
    success: false,
    error: message
  });
};

