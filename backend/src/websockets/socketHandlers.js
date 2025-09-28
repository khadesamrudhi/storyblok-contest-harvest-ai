// src/websockets/socketHandlers.js

const logger = require('../utils/logger');

let ioInstance = null;

function getIO() {
  if (!ioInstance) throw new Error('Socket.IO not initialized');
  return ioInstance;
}

function emitGlobal(event, payload) {
  try {
    getIO().emit(event, payload);
  } catch (err) {
    logger.warn('emitGlobal failed', { event, err: err.message });
  }
}

function emitToRoom(room, event, payload) {
  try {
    getIO().to(room).emit(event, payload);
  } catch (err) {
    logger.warn('emitToRoom failed', { room, event, err: err.message });
  }
}

function emitToUser(userId, event, payload) {
  if (!userId) return emitGlobal(event, payload);
  return emitToRoom(`user:${userId}`, event, payload);
}

function setupSocketHandlers(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Basic identification via query (optional)
    const { userId, token } = socket.handshake.query || {};
    if (userId) {
      try { socket.join(`user:${userId}`); } catch {}
    }
    socket.join('global');
    logger.info('Socket connected', { id: socket.id, userId: userId || null });

    // Join/leave arbitrary rooms
    socket.on('room:join', (room) => {
      if (typeof room === 'string' && room) {
        socket.join(room);
        socket.emit('room:joined', room);
      }
    });

    socket.on('room:leave', (room) => {
      if (typeof room === 'string' && room) {
        socket.leave(room);
        socket.emit('room:left', room);
      }
    });

    // Heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { ts: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { id: socket.id, reason });
    });
  });

  return io;
}

module.exports = {
  setupSocketHandlers,
  getIO,
  emitGlobal,
  emitToRoom,
  emitToUser
};

