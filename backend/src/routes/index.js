// src/routes/index.js

const express = require('express');

// Import sub-routers
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const competitorRoutes = require('./competitor.routes');
const scrapingRoutes = require('./scraping.routes');
const assetRoutes = require('./asset.routes');
const trendRoutes = require('./trend.routes');
const contentRoutes = require('./content.routes');
const aiRoutes = require('./ai.routes');
const storyblokRoutes = require('./storyblok.routes');

// Returns an Express router with all routes mounted under their paths
function buildRouter() {
  const router = express.Router();

  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/competitors', competitorRoutes);
  router.use('/scraping', scrapingRoutes);
  router.use('/assets', assetRoutes);
  router.use('/trends', trendRoutes);
  router.use('/content', contentRoutes);
  router.use('/ai', aiRoutes);
  router.use('/storyblok', storyblokRoutes);

  return router;
}

// Convenience helper to mount on an app under a base path (default: /api)
function mount(app, base = '/api') {
  const router = buildRouter();
  app.use(base, router);
  return router;
}

module.exports = { buildRouter, mount };

