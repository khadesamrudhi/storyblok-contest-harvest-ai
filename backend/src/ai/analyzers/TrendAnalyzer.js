// src/ai/analyzers/TrendAnalyzer.js

const { TrendScraper } = require('../../scrapers/trends/TrendScraper');
const OpenAIClient = require('../models/OpenAIClient.clean');
const logger = require('../../utils/logger');

class TrendAnalyzer {
  constructor() {
    this.scraper = new TrendScraper();
    this.openAI = new OpenAIClient();
  }

  async analyze(options = {}) {
    try {
      const res = await this.scraper.scrapeTrends(options);
      const scored = this.scoreTrends(res.trends || []);
      const summary = await this.summarize(scored.slice(0, 10));
      return {
        generated_at: new Date().toISOString(),
        total: scored.length,
        top: scored.slice(0, options.limit || 20),
        summary
      };
    } catch (err) {
      logger.error('Trend analysis failed', err);
      throw err;
    }
  }

  scoreTrends(items) {
    // Normalize to common structure: { keyword, source, trend_score }
    const normalized = items.map(t => ({
      keyword: t.keyword || t.title || '',
      source: t.source || 'unknown',
      trend_score: typeof t.trend_score === 'number' ? t.trend_score : (t.value || 0)
    })).filter(t => t.keyword);

    // Aggregate by keyword across sources
    const map = new Map();
    for (const t of normalized) {
      const key = t.keyword.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { keyword: t.keyword, sources: new Set([t.source]), scoreSum: t.trend_score, count: 1 });
      } else {
        const obj = map.get(key);
        obj.sources.add(t.source);
        obj.scoreSum += t.trend_score;
        obj.count += 1;
      }
    }

    const aggregated = Array.from(map.values()).map(o => ({
      keyword: o.keyword,
      sources: Array.from(o.sources),
      avg_score: Math.round((o.scoreSum / o.count) * 100) / 100,
      popularity: Math.round((o.scoreSum) * 10) / 10
    }));

    return aggregated.sort((a, b) => b.popularity - a.popularity);
  }

  async summarize(topItems) {
    try {
      if (!topItems.length) return '';
      const list = topItems.map((t, i) => `${i + 1}. ${t.keyword} (sources: ${t.sources.join('/')}, score: ${t.avg_score})`).join('\n');
      const prompt = `Provide a concise summary of the following trending topics and what they imply:\n${list}\nReturn 3-5 bullet insights.`;
      return await this.openAI.generateCompletion(prompt, { temperature: 0.4, maxTokens: 250 });
    } catch {
      return '';
    }
  }
}

module.exports = TrendAnalyzer;

