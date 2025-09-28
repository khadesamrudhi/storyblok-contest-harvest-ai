// src/controllers/ai.controller.js

const ContentAnalyzer = require('../ai/analyzers/ContentAnalyzer');
const ImageAnalyzer = require('../ai/analyzers/ImageAnalyzer');
const PerformancePredictor = require('../ai/analyzers/PerformancePredictor');
const TrendAnalyzer = require('../ai/analyzers/TrendAnalyzer');
const CompetitorAnalyzer = require('../ai/analyzers/CompetitorAnalyzer');

const ContentGenerator = require('../ai/generators/ContentGenerator');
const MetadataGenerator = require('../ai/generators/MetadataGenerator');
const SuggestionGenerator = require('../ai/generators/SuggestionGenerator');

const logger = require('../utils/logger');

const contentAnalyzer = new ContentAnalyzer();
const imageAnalyzer = new ImageAnalyzer();
const predictor = new PerformancePredictor();
const trendAnalyzer = new TrendAnalyzer();
const competitorAnalyzer = new CompetitorAnalyzer();

const contentGenerator = new ContentGenerator();
const metadataGenerator = new MetadataGenerator();
const suggestionGenerator = new SuggestionGenerator();

module.exports = {
  async analyzeContent(req, res, next) {
    try {
      const { content = '', contentType = 'blog' } = req.body || {};
      const analysis = await contentAnalyzer.analyze(content);
      const prediction = await predictor.predictFromAnalysis(analysis, contentType);
      res.json({ success: true, analysis, prediction });
    } catch (err) {
      logger.error('analyzeContent failed', err);
      next(err);
    }
  },

  async analyzeImage(req, res, next) {
    try {
      const { url, context } = req.body || {};
      const buffer = req.file ? req.file.buffer : undefined; // if using multer
      const result = await imageAnalyzer.analyzeImage({ url, buffer, context });
      res.json({ success: true, result });
    } catch (err) {
      logger.error('analyzeImage failed', err);
      next(err);
    }
  },

  async analyzeTrends(req, res, next) {
    try {
      const options = req.body || {};
      const result = await trendAnalyzer.analyze(options);
      res.json({ success: true, result });
    } catch (err) {
      logger.error('analyzeTrends failed', err);
      next(err);
    }
  },

  async analyzeCompetitor(req, res, next) {
    try {
      const payload = req.body || {};
      const result = await competitorAnalyzer.analyze(payload);
      res.json({ success: true, result });
    } catch (err) {
      logger.error('analyzeCompetitor failed', err);
      next(err);
    }
  },

  async generateContent(req, res, next) {
    try {
      const options = req.body || {};
      const result = await contentGenerator.generate(options);
      res.json({ success: true, result });
    } catch (err) {
      logger.error('generateContent failed', err);
      next(err);
    }
  },

  async generateMetadata(req, res, next) {
    try {
      const { content = '', options = {} } = req.body || {};
      const result = await metadataGenerator.generateAll(content, options);
      res.json({ success: true, result });
    } catch (err) {
      logger.error('generateMetadata failed', err);
      next(err);
    }
  },

  async suggest(req, res, next) {
    try {
      const { type, payload, count, tone, format, platform, addHashtags } = req.body || {};
      let result;
      switch ((type || '').toLowerCase()) {
        case 'headlines':
          result = await suggestionGenerator.headlines(payload, count, tone);
          break;
        case 'ctas':
          result = await suggestionGenerator.ctas(payload, count, tone);
          break;
        case 'image-prompts':
          result = await suggestionGenerator.imagePrompts(payload, count, format);
          break;
        case 'social-captions':
          result = await suggestionGenerator.socialCaptions(payload, platform, count, tone, addHashtags);
          break;
        case 'improvements':
          result = await suggestionGenerator.improvements(payload);
          break;
        case 'ab-variants':
          result = await suggestionGenerator.abTestVariants(payload, count, tone);
          break;
        default:
          return res.status(400).json({ success: false, error: 'Unknown suggestion type' });
      }
      res.json({ success: true, result });
    } catch (err) {
      logger.error('suggest failed', err);
      next(err);
    }
  }
};

