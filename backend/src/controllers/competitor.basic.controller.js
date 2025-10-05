// src/controllers/competitor.basic.controller.js

const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const CompetitorAnalyzer = require('../ai/analyzers/CompetitorAnalyzer');
const { WebsiteScraper } = require('../scrapers/competitors/WebsiteScraper');
const logger = require('../utils/logger');

const analyzer = new CompetitorAnalyzer();
const websiteScraper = new WebsiteScraper();

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
      const userId = req.user?.id;
      await supabaseClient.initialize();
      const { website } = req.body || {};

      let analysisInput = req.body || {};

      // If a website is provided, do a live scrape and map to analyzer shape
      let scraped = null;
      if (website) {
        try {
          scraped = await websiteScraper.scrapeWebsite(website);
        } catch (scrapeErr) {
          logger.error('Website scrape failed in analyze()', scrapeErr);
          return res.status(400).json({ success: false, message: 'Failed to scrape the provided website', error: scrapeErr.message });
        }

        // Map WebsiteScraper result to CompetitorAnalyzer expected input
        const pageItem = {
          url: scraped.url,
          metadata: scraped.metadata,
          headings: scraped.headings,
          images: scraped.images,
          links: scraped.links
        };

        const contentItem = {
          title: scraped.metadata?.title || scraped.url,
          url: scraped.url,
          content: scraped.content || ''
        };

        analysisInput = {
          website: scraped.url,
          pages: [pageItem],
          content: [contentItem],
          social_links: scraped.socialLinks || {}
        };
      }

      const result = await analyzer.analyze(analysisInput);

      // Persist analysis for history if possible
      try {
        await supabaseClient.createAnalysis({
          id: require('uuid').v4(),
          user_id: userId || null,
          type: 'competitor_analysis',
          competitor_id: null,
          results: {
            analysis: result,
            scraped_summary: scraped ? {
              url: scraped.url,
              technologies: scraped.technologies,
              socialLinks: scraped.socialLinks,
              contactInfo: scraped.contactInfo,
              scrapedAt: scraped.scrapedAt
            } : null
          },
          created_at: new Date().toISOString()
        });
      } catch (saveErr) {
        logger.warn('Failed to persist competitor analysis', saveErr);
        // non-fatal
      }

      res.json({ success: true, result, scraped });
    } catch (err) {
      logger.error('Analyze competitor failed', err);
      next(err);
    }
  }
};
