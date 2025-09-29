// server.js - Main Entry Point for ContentHarvest AI Backend
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '.env'), encoding: 'utf8' });
// Node <20 compatibility: ensure Web Streams globals exist for libraries like undici
try {
  const streamWeb = require('stream/web');
  if (!global.ReadableStream && streamWeb.ReadableStream) global.ReadableStream = streamWeb.ReadableStream;
  if (!global.WritableStream && streamWeb.WritableStream) global.WritableStream = streamWeb.WritableStream;
  if (!global.TransformStream && streamWeb.TransformStream) global.TransformStream = streamWeb.TransformStream;
} catch (_) {
  // ignore if not available
}

try {
  const { Blob } = require('buffer');
  if (!global.Blob && Blob) global.Blob = Blob;
} catch (_) {
  // ignore if not available
}
// Import middleware
const loggingMiddleware = require('./src/middleware/logging.middleware');
const { initializeDatabase } = require('./src/integrations/storage/SupabaseClient');
// Scraping scheduler disabled (no Redis/Bull in this environment)
const { initializeCronJobs } = require('./src/scrapers/scheduler/CronJobs');
const { setupSocketHandlers } = require('./src/websockets/socketHandlers');
const logger = require('./src/utils/logger');

// Import routes
const competitorRoutes = require('./src/routes/competitor.routes');
const scrapingRoutes = require('./src/routes/scraping.routes');
const trendRoutes = require('./src/routes/trend.routes');
const assetRoutes = require('./src/routes/asset.routes');
const insightsRoutes = require('./src/routes/insights.routes');
const storyblokRoutes = require('./src/routes/storyblok.routes');

// Create app/server and Socket.IO
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Core middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
// Allow frontend on localhost:3000 by default
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
}));
// Ensure preflight is handled for all routes
// Note: Do not register a wildcard OPTIONS route on Express 5; handled by CORS above
app.use(loggingMiddleware);

// Routes
app.use('/api/competitors', competitorRoutes);
app.use('/api/scraping', scrapingRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/storyblok', storyblokRoutes);

// Health endpoint
app.get('/health', (req, res) => res.json({ ok: true }));

// Initialize database and services
async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database connected successfully');

    // Scraping scheduler disabled for this environment; proceeding without Redis/Bull
    logger.warn('Scraping scheduler is disabled (no Redis).');
    // Setup WebSocket handlers
    setupSocketHandlers(io);
    logger.info('WebSocket handlers configured');

    // Initialize cron-based jobs
    const cronManager = initializeCronJobs();
    global.cronManager = cronManager;
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`ContentHarvest AI Backend running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    // Do not hard-exit here to avoid Windows libuv assertion; allow logs to flush
    return;
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();