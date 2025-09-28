// src/middleware/cors.middleware.js

const cors = require('cors');

function buildCorsOptions() {
  const defaultOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowList = (process.env.CORS_ORIGINS || defaultOrigin)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const options = {
    origin: function(origin, callback) {
      // Allow non-browser requests (no origin) and whitelisted origins
      if (!origin || allowList.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    credentials: true,
    maxAge: 600
  };

  return options;
}

// Middleware instance ready to use
const corsMiddleware = cors(buildCorsOptions());

// Also export a builder for custom routes
function createCors(options = {}) {
  return cors({ ...buildCorsOptions(), ...options });
}

module.exports = {
  corsMiddleware,
  createCors,
  buildCorsOptions
};

