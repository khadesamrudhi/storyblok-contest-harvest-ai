// src/middleware/rateLimit.middleware.js

const rateLimit = require('express-rate-limit');

function buildRateLimitOptions(overrides = {}) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000); // 15 min
  const max = Number(process.env.RATE_LIMIT_MAX || 100);
  const standardHeaders = true; // Return rate limit info in the `RateLimit-*` headers
  const legacyHeaders = false; // Disable the `X-RateLimit-*` headers

  const message = overrides.message || {
    error: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later.'
  };

  return {
    windowMs,
    max,
    standardHeaders,
    legacyHeaders,
    message,
    ...overrides
  };
}

function createRateLimiter(options = {}) {
  return rateLimit(buildRateLimitOptions(options));
}

// Default limiter
const rateLimiter = createRateLimiter();

module.exports = {
  rateLimiter,
  createRateLimiter,
  buildRateLimitOptions
};

