// src/controllers/content.controller.js

const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const ContentAnalyzer = require('../ai/analyzers/ContentAnalyzer');
const PerformancePredictor = require('../ai/analyzers/PerformancePredictor');
const ContentGenerator = require('../ai/generators/ContentGenerator');
const MetadataGenerator = require('../ai/generators/MetadataGenerator');
const logger = require('../utils/logger');

const analyzer = new ContentAnalyzer();
const predictor = new PerformancePredictor();
const generator = new ContentGenerator();
const metaGen = new MetadataGenerator();

module.exports = {
  // GET /api/content
  async list(req, res, next) {
    try {
      const userId = req.user?.id;
      await supabaseClient.initialize();
      const data = await supabaseClient.getContentByUserId(userId);
      res.json({ success: true, data });
    } catch (err) {
      logger.error('List content failed', err);
      next(err);
    }
  },

  // POST /api/content
  async create(req, res, next) {
    try {
      const userId = req.user?.id;
      await supabaseClient.initialize();
      const { title = '', body = '', metadata = {} } = req.body || {};
      const payload = {
        user_id: userId,
        title,
        body,
        metadata,
        created_at: new Date().toISOString()
      };
      const data = await supabaseClient.createContent(payload);
      res.status(201).json({ success: true, data });
    } catch (err) {
      logger.error('Create content failed', err);
      next(err);
    }
  },

  // POST /api/content/analyze
  async analyze(req, res, next) {
    try {
      const { content = '', contentType = 'blog' } = req.body || {};
      const analysis = await analyzer.analyze(content);
      const prediction = await predictor.predictFromAnalysis(analysis, contentType);
      res.json({ success: true, analysis, prediction });
    } catch (err) {
      logger.error('Analyze content failed', err);
      next(err);
    }
  },

  // POST /api/content/generate
  async generate(req, res, next) {
    try {
      const options = req.body || {};
      const result = await generator.generate(options);
      // also compute metadata for convenience
      const meta = await metaGen.generateAll(result.draft || '', {});
      res.json({ success: true, result, meta });
    } catch (err) {
      logger.error('Generate content failed', err);
      next(err);
    }
  }
};

