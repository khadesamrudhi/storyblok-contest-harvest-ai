// src/utils/validators.js

const { body, query, param } = require('express-validator');

const VALID_SOURCES = ['google_trends', 'google', 'reddit', 'news', 'twitter'];

const pagination = [
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be 1-200'),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset must be >= 0')
];

const analyzeTrends = [
  body('sources').optional().isArray().withMessage('sources must be array'),
  body('sources.*').optional().isIn(VALID_SOURCES).withMessage('invalid source'),
  body('keywords').optional().isArray().withMessage('keywords must be array of strings'),
  body('keywords.*').optional().isString().isLength({ min: 1, max: 100 }),
  body('timeframe').optional().isString(),
  body('geo').optional().isString().isLength({ min: 2, max: 5 }),
  body('subreddits').optional().isArray(),
  body('subreddits.*').optional().isString().isLength({ min: 1, max: 50 }),
  body('country').optional().isString().isLength({ min: 2, max: 2 }),
  body('category').optional().isString().isLength({ min: 3, max: 30 }),
  body('woeid').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 100 }),
  body('save').optional().isBoolean(),
];

module.exports = { pagination, analyzeTrends };

