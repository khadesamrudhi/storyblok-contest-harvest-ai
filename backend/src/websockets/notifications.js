// src/websockets/notifications.js

const { emitToUser, emitToRoom, emitGlobal } = require('./socketHandlers');

const CHANNEL = 'notification';

function buildPayload({ title = '', body = '', level = 'info', data = {}, ts = Date.now() }) {
  return { title, body, level, data, ts };
}

// Send a notification to a specific user (emits to room `user:{userId}`)
function notifyUser(userId, { title, body = '', level = 'info', data = {} }) {
  if (!userId) return notifyAll({ title, body, level, data });
  const payload = buildPayload({ title, body, level, data });
  emitToUser(userId, CHANNEL, payload);
  return payload;
}

// Send a notification to a specific room
function notifyRoom(room, { title, body = '', level = 'info', data = {} }) {
  const payload = buildPayload({ title, body, level, data });
  emitToRoom(room, CHANNEL, payload);
  return payload;
}

// Broadcast to everyone
function notifyAll({ title, body = '', level = 'info', data = {} }) {
  const payload = buildPayload({ title, body, level, data });
  emitGlobal(CHANNEL, payload);
  return payload;
}

// Convenience helpers
function info(userId, title, body = '', data = {}) {
  return notifyUser(userId, { title, body, level: 'info', data });
}

function success(userId, title, body = '', data = {}) {
  return notifyUser(userId, { title, body, level: 'success', data });
}

function warning(userId, title, body = '', data = {}) {
  return notifyUser(userId, { title, body, level: 'warning', data });
}

function error(userId, title, body = '', data = {}) {
  return notifyUser(userId, { title, body, level: 'error', data });
}

module.exports = {
  notifyUser,
  notifyRoom,
  notifyAll,
  info,
  success,
  warning,
  error
};

