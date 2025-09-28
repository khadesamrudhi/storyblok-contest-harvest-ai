// src/controllers/trend.controller.js

const TrendAnalyzer = require('../ai/analyzers/TrendAnalyzer');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const logger = require('../utils/logger');
const { emitAnalysisStart, emitAnalysisComplete, emitAnalysisError } = require('../websockets/analysisUpdates');

const analyzer = new TrendAnalyzer();
module.exports = {
  // POST /api/trends/analyze
  async analyze(req, res, next) {
    try {
      const options = req.body || {};
      const taskId = `trend:${Date.now()}`;
      const userId = req.user?.id || null;

      // Emit start
      emitAnalysisStart({ taskId, userId, meta: { action: 'trends.analyze', options: { ...options, save: undefined } } });

      const result = await analyzer.analyze(options);

      // Optionally persist top trends
      if (options.save === true) {
        try {
          await supabaseClient.initialize();
          const userId = req.user?.id || null;
          for (const t of (result.top || []).slice(0, 20)) {
            await supabaseClient.createTrend({
              user_id: userId,
              keyword: t.keyword,
              sources: t.sources,
              avg_score: t.avg_score,
              popularity: t.popularity,
              created_at: new Date().toISOString()
            });
          }
        } catch (e) {
          logger.warn('Failed to save trends', e);
        }
      }
      // Emit complete
      emitAnalysisComplete({ taskId, userId, result: { total: result.total, topCount: (result.top || []).length } });

      res.json({ success: true, result, taskId });
    } catch (err) {
      logger.error('Trend analyze failed', err);
      try {
        const userId = req.user?.id || null;
        emitAnalysisError({ taskId: 'trend:unknown', userId, error: err.message });
      } catch {}
      next(err);
    }
  },

  // GET /api/trends/latest
  async latest(req, res, next) {
    try {
      await supabaseClient.initialize();
      const data = await supabaseClient.getLatestTrends(Number(req.query.limit || 50));
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Get latest trends failed', err);
      next(err);
    }
  },

  // GET /api/trends/category/:category
  async byCategory(req, res, next) {
    try {
      await supabaseClient.initialize();
      const data = await supabaseClient.getTrendsByCategory(req.params.category, Number(req.query.limit || 20));
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Get trends by category failed', err);
      next(err);
    }
  }
};

