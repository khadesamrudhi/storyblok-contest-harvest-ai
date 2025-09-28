// src/jobs/reportGeneration.js

const logger = require('../utils/logger');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const OpenAIClient = require('../ai/models/OpenAIClient.clean');

function startOfDayIso(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDayIso(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

async function aggregateDailyStats({ date = new Date(), userId = null } = {}) {
  if (!supabaseClient.isInitialized) {
    await supabaseClient.initialize();
  }
  const from = startOfDayIso(date);
  const to = endOfDayIso(date);

  const db = supabaseClient.getClient();

  // Scraping jobs
  const scraping = await db
    .from('scraping_jobs')
    .select('*')
    .gte('created_at', from)
    .lte('created_at', to)
    .then(({ data, error }) => { if (error) throw error; return data || []; });

  // Trends created today
  const trends = await db
    .from('trends')
    .select('*')
    .gte('created_at', from)
    .lte('created_at', to)
    .then(({ data, error }) => { if (error) throw error; return data || []; });

  // Content ingested today (optional by user)
  let contentQuery = db
    .from('content')
    .select('*')
    .gte('created_at', from)
    .lte('created_at', to);
  if (userId) contentQuery = contentQuery.eq('user_id', userId);
  const content = await contentQuery.then(({ data, error }) => { if (error) throw error; return data || []; });

  const stats = {
    date: from.split('T')[0],
    totals: {
      scraping_jobs: scraping.length,
      trends: trends.length,
      content_items: content.length
    },
    scraping_breakdown: {
      pending: scraping.filter(j => j.status === 'pending').length,
      running: scraping.filter(j => j.status === 'running').length,
      completed: scraping.filter(j => j.status === 'completed').length,
      failed: scraping.filter(j => j.status === 'failed').length
    },
    top_trends: trends
      .sort((a, b) => (b.trend_score || 0) - (a.trend_score || 0))
      .slice(0, 10)
      .map(t => ({ keyword: t.keyword, score: t.trend_score, sources: t.sources })),
    recent_content: content
      .slice(0, 10)
      .map(c => ({ id: c.id, title: c.content_title, type: c.content_type }))
  };

  return stats;
}

async function summarizeStats(stats) {
  const openai = new OpenAIClient();
  const prompt = `Create a concise daily report from the following stats. Include key wins, issues, and next-step recommendations.\n\n${JSON.stringify(stats, null, 2)}`;
  try {
    const summary = await openai.generateCompletion(prompt, { temperature: 0.4, maxTokens: 500 });
    return summary;
  } catch (err) {
    logger.error('Failed to summarize daily stats', { error: err.message });
    return '';
  }
}

// Generate a report for the given date and persist in 'analyses' as 'daily_report'
async function generateDailyReport({ date = new Date(), userId = null } = {}) {
  try {
    const stats = await aggregateDailyStats({ date, userId });
    const summary = await summarizeStats(stats);

    // Persist as analysis
    const saved = await supabaseClient.createAnalysis({
      user_id: userId,
      type: 'daily_report',
      input_context: { date: stats.date },
      results: { stats, summary },
      created_at: new Date().toISOString()
    });

    logger.info('Daily report generated', { id: saved?.id, date: stats.date });
    return { stats, summary, saved };
  } catch (err) {
    logger.error('Daily report generation failed', { error: err.message });
    throw err;
  }
}

module.exports = {
  generateDailyReport
};

