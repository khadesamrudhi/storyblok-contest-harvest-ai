// src/websockets/scrapingUpdates.js

const { emitToUser, emitToRoom, emitGlobal } = require('./socketHandlers');

const CHANNEL = 'scraping';

function emitScrapingStart({ jobId, userId = null, meta = {} }) {
  const payload = { type: 'start', jobId, meta, ts: Date.now() };
  userId ? emitToUser(userId, CHANNEL, payload) : emitGlobal(CHANNEL, payload);
}

function emitScrapingProgress({ jobId, userId = null, progress = 0, message = '', meta = {} }) {
  const payload = { type: 'progress', jobId, progress, message, meta, ts: Date.now() };
  userId ? emitToUser(userId, CHANNEL, payload) : emitGlobal(CHANNEL, payload);
}

function emitScrapingComplete({ jobId, userId = null, result = {}, meta = {} }) {
  const payload = { type: 'complete', jobId, result, meta, ts: Date.now() };
  userId ? emitToUser(userId, CHANNEL, payload) : emitGlobal(CHANNEL, payload);
}

function emitScrapingError({ jobId, userId = null, error = '', meta = {} }) {
  const payload = { type: 'error', jobId, error: String(error), meta, ts: Date.now() };
  userId ? emitToUser(userId, CHANNEL, payload) : emitGlobal(CHANNEL, payload);
}

module.exports = {
  emitScrapingStart,
  emitScrapingProgress,
  emitScrapingComplete,
  emitScrapingError
};

