// src/ai/analyzers/CompetitorAnalyzer.js

const ContentAnalyzer = require('./ContentAnalyzer');
const OpenAIClient = require('../models/OpenAIClient.clean');
const logger = require('../../utils/logger');

class CompetitorAnalyzer {
  constructor() {
    this.contentAnalyzer = new ContentAnalyzer();
    this.openAI = new OpenAIClient();
  }

  async analyze(competitorData) {
    try {
      const { website, content = [], pages = [], social_links = {} } = competitorData || {};

      const contentInsights = await this.analyzeTopContent(content);
      const seoInsights = this.basicSEO(pages);
      const social = this.socialPresence(social_links);
      const gaps = await this.gapAnalysis(competitorData, contentInsights.top_keywords);
      const score = this.overallScore(contentInsights, seoInsights, social);

      return {
        website,
        analyzed_at: new Date().toISOString(),
        content_analysis: contentInsights,
        seo_analysis: seoInsights,
        social_presence: social,
        gaps_opportunities: gaps,
        competitive_score: score
      };
    } catch (err) {
      logger.error('Competitor analysis failed', err);
      throw err;
    }
  }

  async analyzeTopContent(contentList) {
    if (!Array.isArray(contentList) || contentList.length === 0) {
      return { content_count: 0, items: [], avg_readability: 0, avg_sentiment: 0, top_keywords: [] };
    }

    const sample = contentList.slice(0, 5);
    const items = [];
    for (const item of sample) {
      const analysis = await this.contentAnalyzer.analyze(item.content || '');
      items.push({ title: item.title || '', url: item.url || '', analysis });
    }

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
    const avg_readability = Math.round(avg(items.map(i => i.analysis.readability?.flesch_score || 0)) * 100) / 100;
    const avg_sentiment = Math.round(avg(items.map(i => i.analysis.sentiment?.score || 0)) * 100) / 100;
    const keywords = items.flatMap(i => (i.analysis.keywords || []).map(k => k.term));
    const top_keywords = [...new Set(keywords)].slice(0, 20);

    return {
      content_count: items.length,
      avg_readability,
      avg_sentiment,
      top_keywords,
      items
    };
  }

  basicSEO(pages) {
    if (!Array.isArray(pages) || pages.length === 0) {
      return { meta_title_avg_length: 0, meta_description_avg_length: 0, h1_usage: 0, image_alt_text_usage: 0, internal_links_avg: 0, external_links_avg: 0, seo_score: 0 };
    }

    let totalTitle = 0, totalDesc = 0, h1 = 0, alt = 0, internal = 0, external = 0;
    for (const p of pages) {
      const titleLen = (p.metadata?.title || '').length;
      const descLen = (p.metadata?.description || '').length;
      totalTitle += titleLen; totalDesc += descLen;
      h1 += (p.headings || []).filter(h => h.level === 1).length;
      alt += (p.images || []).filter(img => (img.alt || '').trim().length > 0).length;
      if (Array.isArray(p.links)) {
        const domain = this.extractDomain(p.url || '');
        const inside = p.links.filter(l => (l.url || '').includes(domain)).length;
        internal += inside;
        external += Math.max(0, p.links.length - inside);
      }
    }
    const n = pages.length;
    const meta_title_avg_length = Math.round(totalTitle / n);
    const meta_description_avg_length = Math.round(totalDesc / n);
    const h1_usage = Math.round((h1 / n) * 100);
    const image_alt_text_usage = Math.round((alt / n) * 100);
    const internal_links_avg = Math.round(internal / n);
    const external_links_avg = Math.round(external / n);

    const seo_score = this.seoScore({ meta_title_avg_length, meta_description_avg_length, h1_usage, image_alt_text_usage, internal_links_avg, external_links_avg });
    return { meta_title_avg_length, meta_description_avg_length, h1_usage, image_alt_text_usage, internal_links_avg, external_links_avg, seo_score };
  }

  seoScore(seo) {
    let score = 0;
    if (seo.meta_title_avg_length >= 50 && seo.meta_title_avg_length <= 60) score += 2; else if (seo.meta_title_avg_length > 0) score += 1;
    if (seo.meta_description_avg_length >= 150 && seo.meta_description_avg_length <= 160) score += 2; else if (seo.meta_description_avg_length > 0) score += 1;
    if (seo.h1_usage >= 80) score += 2; else if (seo.h1_usage >= 50) score += 1;
    if (seo.image_alt_text_usage >= 80) score += 2; else if (seo.image_alt_text_usage >= 50) score += 1;
    if (seo.internal_links_avg >= 3) score += 1;
    if (seo.external_links_avg >= 1) score += 1;
    return Math.min(10, score);
  }

  socialPresence(social_links) {
    const platforms = Object.keys(social_links || {});
    return {
      platforms: platforms.reduce((acc, p) => { acc[p] = { url: social_links[p], active: true }; return acc; }, {}),
      social_engagement_estimate: Math.min(10, platforms.length * 2)
    };
  }

  async gapAnalysis(competitorData, topKeywords = []) {
    try {
      const prompt = `Identify content gaps and opportunities for the competitor.\nWebsite: ${competitorData?.website}\nTop Keywords: ${topKeywords.join(', ')}\nReturn JSON with keys: content_gaps, keyword_opportunities, format_opportunities, audience_opportunities, seo_opportunities.`;
      const res = await this.openAI.generateCompletion(prompt, { temperature: 0.2 });
      return JSON.parse(res);
    } catch {
      return { content_gaps: [], keyword_opportunities: [], format_opportunities: [], audience_opportunities: [], seo_opportunities: [] };
    }
  }

  overallScore(contentInsights, seo, social) {
    const contentQuality = this.contentQualityScore(contentInsights.items || []);
    let score = 0;
    score += contentQuality * 0.3;
    score += (seo.seo_score || 0) * 0.25;
    score += (social.social_engagement_estimate || 0) * 0.02; // normalize to 0-10
    if (contentInsights?.content_count >= 3) score += 1; // consistency bonus
    return Math.min(10, Math.max(0, Math.round(score * 10) / 10));
  }

  contentQualityScore(items) {
    if (!items.length) return 0;
    const scores = items.map(i => {
      let s = 5;
      const r = i.analysis.readability?.flesch_score || 0;
      if (r) s += (r / 100) * 2;
      if ((i.analysis.sentiment?.score || 0) > 0) s += 1;
      if ((i.analysis.word_count || 0) > 300) s += 1;
      return Math.min(10, s);
    });
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  }

  extractDomain(url) {
    try { return new URL(url).hostname; } catch { return ''; }
  }
}

module.exports = CompetitorAnalyzer;

