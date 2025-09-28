// src/services/trend.service.js

const logger = require('../utils/logger');
const TrendAnalyzer = require('../ai/analyzers/TrendAnalyzer');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');

class TrendService {
  constructor() {
    this.analyzer = new TrendAnalyzer();
  }

  async analyze(options = {}) {
    try {
      return await this.analyzer.analyze(options);
    } catch (err) {
      logger.error('TrendService.analyze failed', err);
      throw err;
    }
  }

  async latest(limit = 50) {
    try {
      await supabaseClient.initialize();
      return await supabaseClient.getLatestTrends(Number(limit));
    } catch (err) {
      logger.error('TrendService.latest failed', err);
      throw err;
    }
  }

  async byCategory(category, limit = 20) {
    try {
      await supabaseClient.initialize();
      return await supabaseClient.getTrendsByCategory(category, Number(limit));
    } catch (err) {
      logger.error('TrendService.byCategory failed', err);
      throw err;
    }
  }
}

module.exports = new TrendService();

