// src/config/environment.js

require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const isTest = env === 'test';

const config = {
  env,
  isProd,
  isTest,
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  logLevel: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  // feature flags
  enableTrends: (process.env.ENABLE_TRENDS || 'true').toLowerCase() === 'true',
  enableScraping: (process.env.ENABLE_SCRAPING || 'true').toLowerCase() === 'true',
  enableWebsockets: (process.env.ENABLE_WEBSOCKETS || 'true').toLowerCase() === 'true'
};

module.exports = config;

