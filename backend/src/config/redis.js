// src/config/redis.js

require('dotenv').config();

const url = process.env.REDIS_URL || '';
const host = process.env.REDIS_HOST || '127.0.0.1';
const port = Number(process.env.REDIS_PORT || 6379);
const username = process.env.REDIS_USERNAME || undefined;
const password = process.env.REDIS_PASSWORD || undefined;
const tls = (process.env.REDIS_TLS || 'false').toLowerCase() === 'true' ? {} : undefined;

const config = { url, host, port, username, password, tls };

// Build Bull queue connection opts
function bullConnection() {
  if (url) {
    return {
      connection: { url, tls }
    };
  }
  return {
    connection: {
      host,
      port,
      username,
      password,
      tls
    }
  };
}

module.exports = { config, bullConnection };

