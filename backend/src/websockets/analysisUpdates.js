// src/websockets/analysisUpdates.js

const { emitToUser, emitGlobal } = require('./socketHandlers');

const CHANNEL = 'analysis';

function emitAnalysisStart({ taskId, userId = null, meta = {} }) {
  const payload = { type: 'start', taskId, meta, ts: Date.now() };
  userId ? emitToUser(userId, CHANNEL, payload) : emitGlobal(CHANNEL, payload);
}

function emitAnalysisProgress({ taskId, userId = null, stage = '', progress = 0, message = '', meta = {} }) {
  const payload = { type: 'progress', taskId, stage, progress, message, meta, ts: Date.now() };
  userId ? emitToUser(userId, CHANNEL, payload) : emitGlobal(CHANNEL, payload);
}

function emitAnalysisComplete({ taskId, userId = null, result = {}, meta = {} }) {
  const payload = { type: 'complete', taskId, result, meta, ts: Date.now() };
  userId ? emitToUser(userId, CHANNEL, payload) : emitGlobal(CHANNEL, payload);
}

function emitAnalysisError({ taskId, userId = null, error = '', meta = {} }) {
  const payload = { type: 'error', taskId, error: String(error), meta, ts: Date.now() };
  userId ? emitToUser(userId, CHANNEL, payload) : emitGlobal(CHANNEL, payload);
}

module.exports = {
  emitAnalysisStart,
  emitAnalysisProgress,
  emitAnalysisComplete,
  emitAnalysisError
};

