// src/jobs/trendAnalysis.js

const logger = require('../utils/logger');
const TrendAnalyzer = require('../ai/analyzers/TrendAnalyzer');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');

// Run trend analysis and persist top results
async function runTrendAnalysisJob(options = {}) {
  const analyzer = new TrendAnalyzer();
  const analysis = await analyzer.analyze({ limit: options.limit || 20, ...(options || {}) });

  try {
    if (!supabaseClient.isInitialized) {
      await supabaseClient.initialize();
    }

    const top = analysis.top || [];
    let saved = 0;
    for (const t of top) {
      try {
        await supabaseClient.createTrend({
          keyword: t.keyword,
          category: options.category || 'general',
          sources: t.sources || [],
          trend_score: t.avg_score || t.popularity || 0,
          created_at: new Date().toISOString()
        });
        saved += 1;
      } catch (err) {
        // Continue on individual failures
      }
    }

    logger.info('TrendAnalysis job saved trends', { saved, total: top.length });
  } catch (err) {
    logger.error('TrendAnalysis job persistence failed', { error: err.message });
  }

  return analysis;
}

module.exports = {
  runTrendAnalysisJob
};

