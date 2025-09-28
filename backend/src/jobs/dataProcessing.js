// src/jobs/dataProcessing.js

const logger = require('../utils/logger');
const ContentAnalyzer = require('../ai/analyzers/ContentAnalyzer');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');

// Analyze provided text content and persist results in 'analyses' table
async function analyzeAndPersistContent({ content, userId = null, metadata = {}, type = 'content_analysis' }) {
  if (!content || typeof content !== 'string') {
    throw new Error('content is required and must be a string');
  }

  const analyzer = new ContentAnalyzer();
  const analysis = await analyzer.analyze(content);

  try {
    if (!supabaseClient.isInitialized) {
      await supabaseClient.initialize();
    }

    const saved = await supabaseClient.createAnalysis({
      user_id: userId,
      type,
      input_context: metadata,
      results: analysis,
      created_at: new Date().toISOString()
    });

    logger.info('DataProcessing job saved analysis', { id: saved.id, type });
    return { analysis, saved };
  } catch (err) {
    logger.error('DataProcessing persistence failed', { error: err.message });
    return { analysis };
  }
}

module.exports = {
  analyzeAndPersistContent
};

