// src/controllers/competitor.basic.controller.js

const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const CompetitorAnalyzer = require('../ai/analyzers/CompetitorAnalyzer');
const logger = require('../utils/logger');

const analyzer = new CompetitorAnalyzer();

module.exports = {
  // GET /api/competitors
  async list(req, res, next) {
    try {
      const userId = req.user?.id;
      await supabaseClient.initialize();
      const data = await supabaseClient.getCompetitorsByUserId(userId);
      res.json({ success: true, data });
    } catch (err) {
      logger.error('List competitors failed', err);
      next(err);
    }
  },

  // POST /api/competitors
  async create(req, res, next) {
    try {
      const userId = req.user?.id;
      await supabaseClient.initialize();
      const payload = { ...req.body, user_id: userId, created_at: new Date().toISOString() };
      const data = await supabaseClient.createCompetitor(payload);
      res.status(201).json({ success: true, data });
    } catch (err) {
      logger.error('Create competitor failed', err);
      next(err);
    }
  },

  // PATCH /api/competitors/:id
  async update(req, res, next) {
    try {
      await supabaseClient.initialize();
      const data = await supabaseClient.updateCompetitor(req.params.id, req.body || {});
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Update competitor failed', err);
      next(err);
    }
  },

  // DELETE /api/competitors/:id
  async remove(req, res, next) {
    try {
      await supabaseClient.initialize();
      const data = await supabaseClient.deleteCompetitor(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Delete competitor failed', err);
      next(err);
    }
  },

  // POST /api/competitors/analyze
  async analyze(req, res, next) {
    try {
      const payload = req.body || {};
      const result = await analyzer.analyze(payload);
      res.json({ success: true, result });
    } catch (err) {
      logger.error('Analyze competitor failed', err);
      next(err);
    }
  }
};
