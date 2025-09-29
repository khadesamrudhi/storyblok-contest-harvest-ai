// src/controllers/competitor.controller.js

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
      const { stale_hours, stale_days, limit } = req.query || {};
      let data;
      if (stale_hours || stale_days) {
        const hours = parseInt(stale_hours || 0, 10) + (parseInt(stale_days || 0, 10) * 24);
        const cutoff = new Date(Date.now() - (isFinite(hours) ? hours : 0) * 60 * 60 * 1000).toISOString();
        data = await supabaseClient.getStaleCompetitors(userId, cutoff, limit ? parseInt(limit, 10) : 50);
      } else {
        data = await supabaseClient.getCompetitorsByUserId(userId);
      }
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

// src/controllers/competitor.controller.js

const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const { WebsiteScraper } = require('../scrapers/competitors/WebsiteScraper');
const { CompetitorAnalyzer } = require('../ai/analyzers/CompetitorAnalyzer');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class CompetitorController {
  constructor() {
    this.websiteScraper = new WebsiteScraper();
    this.competitorAnalyzer = new CompetitorAnalyzer();
  }

  // Add new competitor
  async addCompetitor(req, res) {
    try {
      const { website, name, description } = req.body;
      const userId = req.user.id;

      if (!website) {
        return res.status(400).json({
          success: false,
          message: 'Website URL is required'
        });
      }

      // Validate URL
      let validUrl;
      try {
        validUrl = new URL(website).href;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid website URL'
        });
      }

      // Check if competitor already exists for this user
      const existingCompetitors = await supabaseClient.getCompetitorsByUserId(userId);
      const exists = existingCompetitors.some(comp => comp.website === validUrl);

      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Competitor with this website already exists'
        });
      }

      // Create competitor record
      const competitorData = {
        id: uuidv4(),
        user_id: userId,
        website: validUrl,
        name: name || validUrl,
        description: description || '',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const competitor = await supabaseClient.createCompetitor(competitorData);

      // Start scraping process (async)
      this.initiateCompetitorScraping(competitor.id, validUrl).catch(error => {
        logger.error('Background scraping failed:', error);
      });

      res.status(201).json({
        success: true,
        message: 'Competitor added successfully. Scraping initiated.',
        competitor
      });

    } catch (error) {
      logger.error('Add competitor error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add competitor'
      });
    }
  }

  // Get all competitors for user
  async getCompetitors(req, res) {
    try {
      const userId = req.user.id;
      const { stale_hours, stale_days, limit } = req.query || {};
      let competitors;
      if (stale_hours || stale_days) {
        const hours = parseInt(stale_hours || 0, 10) + (parseInt(stale_days || 0, 10) * 24);
        const cutoff = new Date(Date.now() - (isFinite(hours) ? hours : 0) * 60 * 60 * 1000).toISOString();
        competitors = await supabaseClient.getStaleCompetitors(userId, cutoff, limit ? parseInt(limit, 10) : 50);
      } else {
        competitors = await supabaseClient.getCompetitorsByUserId(userId);
      }

      res.json({
        success: true,
        competitors
      });

    } catch (error) {
      logger.error('Get competitors error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch competitors'
      });
    }
  }

  // Get competitor details with analysis
  async getCompetitorDetails(req, res) {
    try {
      const { competitorId } = req.params;
      const userId = req.user.id;

      // Get competitor data
      const competitor = await supabaseClient.query('competitors', {
        filters: { id: competitorId, user_id: userId },
        limit: 1
      });

      if (!competitor || competitor.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Competitor not found'
        });
      }

      // Get related scraping jobs and analyses
      const scrapingJobs = await supabaseClient.query('scraping_jobs', {
        filters: { competitor_id: competitorId },
        order: { column: 'created_at', ascending: false },
        limit: 10
      });

      const analyses = await supabaseClient.query('analyses', {
        filters: { competitor_id: competitorId },
        order: { column: 'created_at', ascending: false },
        limit: 5
      });

      res.json({
        success: true,
        competitor: competitor[0],
        scraping_jobs: scrapingJobs,
        analyses
      });

    } catch (error) {
      logger.error('Get competitor details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch competitor details'
      });
    }
  }

  // Update competitor
  async updateCompetitor(req, res) {
    try {
      const { competitorId } = req.params;
      const { name, description } = req.body;
      const userId = req.user.id;

      // Verify ownership
      const existingCompetitor = await supabaseClient.query('competitors', {
        filters: { id: competitorId, user_id: userId }
      });

      if (!existingCompetitor || existingCompetitor.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Competitor not found'
        });
      }

      const updates = {
        updated_at: new Date().toISOString()
      };

      if (name) updates.name = name;
      if (description) updates.description = description;

      const updatedCompetitor = await supabaseClient.updateCompetitor(competitorId, updates);

      res.json({
        success: true,
        message: 'Competitor updated successfully',
        competitor: updatedCompetitor
      });

    } catch (error) {
      logger.error('Update competitor error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update competitor'
      });
    }
  }

  // Delete competitor
  async deleteCompetitor(req, res) {
    try {
      const { competitorId } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const existingCompetitor = await supabaseClient.query('competitors', {
        filters: { id: competitorId, user_id: userId }
      });

      if (!existingCompetitor || existingCompetitor.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Competitor not found'
        });
      }

      await supabaseClient.deleteCompetitor(competitorId);

      res.json({
        success: true,
        message: 'Competitor deleted successfully'
      });

    } catch (error) {
      logger.error('Delete competitor error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete competitor'
      });
    }
  }

  // Analyze competitor
  async analyzeCompetitor(req, res) {
    try {
      const { competitorId } = req.params;
      const userId = req.user.id;

      // Get competitor data
      const competitor = await supabaseClient.query('competitors', {
        filters: { id: competitorId, user_id: userId }
      });

      if (!competitor || competitor.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Competitor not found'
        });
      }

      // Get scraped data for analysis
      const scrapedData = await this.getCompetitorScrapedData(competitorId);
      
      if (!scrapedData) {
        return res.status(400).json({
          success: false,
          message: 'No scraped data available. Please scrape the competitor first.'
        });
      }

      // Perform analysis
      const analysis = await this.competitorAnalyzer.analyzeCompetitor({
        ...competitor[0],
        ...scrapedData
      });

      // Save analysis to database
      const analysisData = {
        id: uuidv4(),
        user_id: userId,
        competitor_id: competitorId,
        type: 'competitor_analysis',
        results: analysis,
        created_at: new Date().toISOString()
      };

      await supabaseClient.createAnalysis(analysisData);

      res.json({
        success: true,
        message: 'Competitor analysis completed',
        analysis
      });

    } catch (error) {
      logger.error('Competitor analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze competitor'
      });
    }
  }

  // Scrape competitor website
  async scrapeCompetitor(req, res) {
    try {
      const { competitorId } = req.params;
      const userId = req.user.id;

      // Get competitor
      const competitor = await supabaseClient.query('competitors', {
        filters: { id: competitorId, user_id: userId }
      });

      if (!competitor || competitor.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Competitor not found'
        });
      }

      // Start scraping job
      const jobId = await this.initiateCompetitorScraping(competitorId, competitor[0].website);

      res.json({
        success: true,
        message: 'Scraping job initiated',
        job_id: jobId
      });

    } catch (error) {
      logger.error('Scrape competitor error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate scraping'
      });
    }
  }

  // Private methods
  async initiateCompetitorScraping(competitorId, website) {
    try {
      // Create scraping job
      const jobData = {
        id: uuidv4(),
        competitor_id: competitorId,
        type: 'competitor_website',
        status: 'running',
        target_url: website,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const job = await supabaseClient.createScrapingJob(jobData);

      // Perform scraping
      const scrapedData = await this.websiteScraper.scrapeWebsite(website);

      // Update job status
      await supabaseClient.updateScrapingJob(job.id, {
        status: 'completed',
        results: scrapedData,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Update competitor status
      await supabaseClient.updateCompetitor(competitorId, {
        status: 'scraped',
        last_scraped: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      logger.info(`Competitor scraping completed for: ${website}`);
      return job.id;

    } catch (error) {
      logger.error('Competitor scraping failed:', error);
      
      // Update job status to failed
      if (job && job.id) {
        await supabaseClient.updateScrapingJob(job.id, {
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        });
      }

      throw error;
    } finally {
      // Clean up browser resources
      await this.websiteScraper.closeBrowser();
    }
  }

  async getCompetitorScrapedData(competitorId) {
    try {
      const scrapingJobs = await supabaseClient.query('scraping_jobs', {
        filters: { competitor_id: competitorId, status: 'completed' },
        order: { column: 'completed_at', ascending: false },
        limit: 1
      });

      if (!scrapingJobs || scrapingJobs.length === 0) {
        return null;
      }

      return scrapingJobs[0].results;

    } catch (error) {
      logger.error('Error getting scraped data:', error);
      return null;
    }
  }
}

// src/routes/competitor.routes.js

const express = require('express');
const CompetitorController = require('../controllers/competitor.controller');
const { body, param } = require('express-validator');
const validationMiddleware = require('../middleware/validation.middleware');

const router = express.Router();
const competitorController = new CompetitorController();

// Validation rules
const addCompetitorValidation = [
  body('website')
    .isURL()
    .withMessage('Please provide a valid website URL'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
];

const competitorIdValidation = [
  param('competitorId')
    .isUUID()
    .withMessage('Invalid competitor ID format')
];

const updateCompetitorValidation = [
  ...competitorIdValidation,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
];

// Routes
router.post('/', addCompetitorValidation, validationMiddleware, competitorController.addCompetitor.bind(competitorController));
router.get('/', competitorController.getCompetitors.bind(competitorController));
router.get('/:competitorId', competitorIdValidation, validationMiddleware, competitorController.getCompetitorDetails.bind(competitorController));
router.put('/:competitorId', updateCompetitorValidation, validationMiddleware, competitorController.updateCompetitor.bind(competitorController));
router.delete('/:competitorId', competitorIdValidation, validationMiddleware, competitorController.deleteCompetitor.bind(competitorController));
router.post('/:competitorId/analyze', competitorIdValidation, validationMiddleware, competitorController.analyzeCompetitor.bind(competitorController));
router.post('/:competitorId/scrape', competitorIdValidation, validationMiddleware, competitorController.scrapeCompetitor.bind(competitorController));

module.exports = router;
  534→
  535→// src/controllers/content.controller.js
  536→
  537→const { supabaseClient } = require('../integrations/storage/SupabaseClient');
  538→const { ContentAnalyzer } = require('../ai/analyzers');
  539→const { OpenAIClient } = require('../ai/models/OpenAIClient.clean');
  540→const logger = require('../utils/logger');

    this.openAIClient = new OpenAIClient();
  }

  // Analyze content
  async analyzeContent(req, res) {
    try {
      const { content, title, contentType = 'blog' } = req.body;
      const userId = req.user.id;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Content is required for analysis'
        });
      }

      // Perform content analysis
      const analysis = await this.contentAnalyzer.analyzeContent(content);

      // Save analysis to database
      const analysisData = {
        id: uuidv4(),
        user_id: userId,
        type: 'content_analysis',
        content_title: title || 'Untitled',
        content_type: contentType,
        content_preview: content.substring(0, 200),
        results: analysis,
        created_at: new Date().toISOString()
      };

      await supabaseClient.createAnalysis(analysisData);

      res.json({
        success: true,
        message: 'Content analysis completed',
        analysis
      });

    } catch (error) {
      logger.error('Content analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze content'
      });
    }
  }

  // Generate content suggestions
  async generateSuggestions(req, res) {
    try {
      const { topic, contentType = 'blog', targetAudience = 'general', count = 5 } = req.body;
      const userId = req.user.id;

      if (!topic) {
        return res.status(400).json({
          success: false,
          message: 'Topic is required for content suggestions'
        });
      }

      // Generate suggestions using AI
      const suggestions = await this.openAIClient.generateContentSuggestions(topic, contentType, targetAudience);

      // Save suggestions to database
      const suggestionData = {
        id: uuidv4(),
        user_id: userId,
        type: 'content_suggestions',
        topic,
        content_type: contentType,
        target_audience: targetAudience,
        results: { suggestions, generated_at: new Date().toISOString() },
        created_at: new Date().toISOString()
      };

      await supabaseClient.createContent(suggestionData);

      res.json({
        success: true,
        message: 'Content suggestions generated',
        suggestions
      });

    } catch (error) {
      logger.error('Content suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate content suggestions'
      });
    }
  }

  // Improve existing content
  async improveContent(req, res) {
    try {
      const { content, improvementType = 'general' } = req.body;
      const userId = req.user.id;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Content is required for improvement'
        });
      }

      // Generate improved content
      const improvedContent = await this.openAIClient.improveContent(content, improvementType);

      // Save improvement to database
      const improvementData = {
        id: uuidv4(),
        user_id: userId,
        type: 'content_improvement',
        original_content: content.substring(0, 500),
        improvement_type: improvementType,
        results: {
          improved_content: improvedContent,
          improvement_type: improvementType,
          generated_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      };

      await supabaseClient.createContent(improvementData);

      res.json({
        success: true,
        message: 'Content improved successfully',
        original_content: content,
        improved_content: improvedContent,
        improvement_type: improvementType
      });

    } catch (error) {
      logger.error('Content improvement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to improve content'
      });
    }
  }

  // Predict content performance
  async predictPerformance(req, res) {
    try {
      const { content, contentType = 'blog' } = req.body;
      const userId = req.user.id;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Content is required for performance prediction'
        });
      }

      // Predict performance using AI
      const prediction = await this.openAIClient.predictContentPerformance(content, contentType);

      // Save prediction to database
      const predictionData = {
        id: uuidv4(),
        user_id: userId,
        type: 'performance_prediction',
        content_type: contentType,
        content_preview: content.substring(0, 200),
        results: prediction,
        created_at: new Date().toISOString()
      };

      await supabaseClient.createAnalysis(predictionData);

      res.json({
        success: true,
        message: 'Performance prediction completed',
        prediction
      });

    } catch (error) {
      logger.error('Performance prediction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to predict performance'
      });
    }
  }

  // Compare two pieces of content
  async compareContent(req, res) {
    try {
      const { content1, content2, title1, title2 } = req.body;
      const userId = req.user.id;

      if (!content1 || !content2) {
        return res.status(400).json({
          success: false,
          message: 'Both content pieces are required for comparison'
        });
      }

      // Perform content comparison
      const comparison = await this.contentAnalyzer.compareContent(content1, content2);

      // Save comparison to database
      const comparisonData = {
        id: uuidv4(),
        user_id: userId,
        type: 'content_comparison',
        content_1_title: title1 || 'Content 1',
        content_2_title: title2 || 'Content 2',
        results: comparison,
        created_at: new Date().toISOString()
      };

      await supabaseClient.createAnalysis(comparisonData);

      res.json({
        success: true,
        message: 'Content comparison completed',
        comparison
      });

    } catch (error) {
      logger.error('Content comparison error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compare content'
      });
    }
  }

  // Get user's content history
  async getContentHistory(req, res) {
    try {
      const userId = req.user.id;
      const { type, limit = 20 } = req.query;

      const options = {
        filters: { user_id: userId },
        order: { column: 'created_at', ascending: false },
        limit: parseInt(limit)
      };

      if (type) {
        options.filters.type = type;
      }

      const content = await supabaseClient.query('content', options);
      const analyses = await supabaseClient.query('analyses', options);

      res.json({
        success: true,
        content,
        analyses,
        total: content.length + analyses.length
      });

    } catch (error) {
      logger.error('Get content history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch content history'
      });
    }
  }

  // Delete content/analysis
  async deleteContent(req, res) {
    try {
      const { contentId } = req.params;
      const { table } = req.query; // 'content' or 'analyses'
      const userId = req.user.id;

      const tableName = table === 'analyses' ? 'analyses' : 'content';

      // Verify ownership
      const items = await supabaseClient.query(tableName, {
        filters: { id: contentId, user_id: userId }
      });

      if (!items || items.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }

      // Delete the item
      const { error } = await supabaseClient.getClient()
        .from(tableName)
        .delete()
        .eq('id', contentId)
        .eq('user_id', userId);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Content deleted successfully'
      });

    } catch (error) {
      logger.error('Delete content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete content'
      });
    }
  }
}

// src/routes/content.routes.js

const express = require('express');
const ContentController = require('../controllers/content.controller');
const { body, param, query } = require('express-validator');
const validationMiddleware = require('../middleware/validation.middleware');

const router = express.Router();
const contentController = new ContentController();

// Validation rules
const analyzeContentValidation = [
  body('content')
    .notEmpty()
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters long'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('contentType')
    .optional()
    .isIn(['blog', 'article', 'social', 'email', 'webpage'])
    .withMessage('Invalid content type')
];

const generateSuggestionsValidation = [
  body('topic')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Topic must be between 2 and 100 characters'),
  body('contentType')
    .optional()
    .isIn(['blog', 'article', 'social', 'email', 'video'])
    .withMessage('Invalid content type'),
  body('targetAudience')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Target audience must be less than 50 characters'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Count must be between 1 and 10')
];

const improveContentValidation = [
  body('content')
    .notEmpty()
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters long'),
  body('improvementType')
    .optional()
    .isIn(['general', 'seo', 'engagement', 'clarity', 'tone'])
    .withMessage('Invalid improvement type')
];

const compareContentValidation = [
  body('content1')
    .notEmpty()
    .isLength({ min: 10 })
    .withMessage('Content 1 must be at least 10 characters long'),
  body('content2')
    .notEmpty()
    .isLength({ min: 10 })
    .withMessage('Content 2 must be at least 10 characters long'),
  body('title1')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title 1 must be less than 200 characters'),
  body('title2')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title 2 must be less than 200 characters')
];

const contentIdValidation = [
  param('contentId')
    .isUUID()
    .withMessage('Invalid content ID format')
];

const historyValidation = [
  query('type')
    .optional()
    .isIn(['content_analysis', 'content_suggestions', 'content_improvement', 'performance_prediction', 'content_comparison'])
    .withMessage('Invalid type filter'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes
router.post('/analyze', analyzeContentValidation, validationMiddleware, contentController.analyzeContent.bind(contentController));
router.post('/suggestions', generateSuggestionsValidation, validationMiddleware, contentController.generateSuggestions.bind(contentController));
router.post('/improve', improveContentValidation, validationMiddleware, contentController.improveContent.bind(contentController));
router.post('/predict', analyzeContentValidation, validationMiddleware, contentController.predictPerformance.bind(contentController));
router.post('/compare', compareContentValidation, validationMiddleware, contentController.compareContent.bind(contentController));
router.get('/history', historyValidation, validationMiddleware, contentController.getContentHistory.bind(contentController));
router.delete('/:contentId', contentIdValidation, validationMiddleware, contentController.deleteContent.bind(contentController));

module.exports = router;

// src/controllers/trend.controller.js

const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const { TrendAnalyzer } = require('../ai/analyzers/TrendAnalyzer');
const { GoogleTrendsScraper, TwitterScraper } = require('../scrapers/trends');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class TrendController {
  constructor() {
    this.trendAnalyzer = new TrendAnalyzer();
    this.googleTrendsScraper = new GoogleTrendsScraper();
    this.twitterScraper = new TwitterScraper();
  }

  // Get trending topics
  async getTrends(req, res) {
    try {
      const { category = 'general', limit = 20, timeframe = '24h' } = req.query;
      
      // Get trends from database
      let trends;
      if (category === 'all') {
        trends = await supabaseClient.getLatestTrends(parseInt(limit));
      } else {
        trends = await supabaseClient.getTrendsByCategory(category, parseInt(limit));
      }

      // Filter by timeframe
      const cutoffTime = this.getTimeframeCutoff(timeframe);
      const filteredTrends = trends.filter(trend => 
        new Date(trend.created_at) >= cutoffTime
      );

      res.json({
        success: true,
        trends: filteredTrends,
        category,
        timeframe,
        count: filteredTrends.length
      });

    } catch (error) {
      logger.error('Get trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trends'
      });
    }
  }

  // Search for trends on specific topic
  async searchTrends(req, res) {
    try {
      const { query, sources = ['google'], timeframe = '7d' } = req.body;
      const userId = req.user.id;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const trendData = [];

      // Search Google Trends
      if (sources.includes('google')) {
        try {
          const googleTrends = await this.googleTrendsScraper.searchTrends(query, timeframe);
          trendData.push(...googleTrends);
        } catch (error) {
          logger.warn('Google Trends search failed:', error.message);
        }
      }

      // Search Twitter trends (if API available)
      if (sources.includes('twitter')) {
        try {
          const twitterTrends = await this.twitterScraper.searchTrends(query);
          trendData.push(...twitterTrends);
        } catch (error) {
          logger.warn('Twitter Trends search failed:', error.message);
        }
      }

      // Analyze and save trends
      const analyzedTrends = await this.analyzeTrendData(trendData, query, userId);

      res.json({
        success: true,
        message: 'Trend search completed',
        query,
        trends: analyzedTrends,
        sources,
        count: analyzedTrends.length
      });

    } catch (error) {
      logger.error('Search trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search trends'
      });
    }
  }

  // Analyze trend for content opportunities
  async analyzeTrend(req, res) {
    try {
      const { trendId } = req.params;
      const userId = req.user.id;

      // Get trend data
      const trend = await supabaseClient.query('trends', {
        filters: { id: trendId },
        limit: 1
      });

      if (!trend || trend.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Trend not found'
        });
      }

      // Perform trend analysis for content opportunities
      const analysis = await this.trendAnalyzer.analyzeTrendForContent(trend[0]);

      // Save analysis
      const analysisData = {
        id: uuidv4(),
        user_id: userId,
        trend_id: trendId,
        type: 'trend_analysis',
        results: analysis,
        created_at: new Date().toISOString()
      };

      await supabaseClient.createAnalysis(analysisData);

      res.json({
        success: true,
        message: 'Trend analysis completed',
        trend: trend[0],
        analysis
      });

    } catch (error) {
      logger.error('Analyze trend error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze trend'
      });
    }
  }

  // Get trend predictions
  async getTrendPredictions(req, res) {
    try {
      const { topic, timeframe = '30d' } = req.query;
      const userId = req.user.id;

      if (!topic) {
        return res.status(400).json({
          success: false,
          message: 'Topic is required for trend prediction'
        });
      }

      // Get historical trend data for the topic
      const historicalTrends = await this.getHistoricalTrends(topic, timeframe);

      // Generate predictions
      const predictions = await this.trendAnalyzer.predictTrendTrajectory(topic, historicalTrends);

      // Save prediction
      const predictionData = {
        id: uuidv4(),
        user_id: userId,
        type: 'trend_prediction',
        topic,
        timeframe,
        results: predictions,
        created_at: new Date().toISOString()
      };

      await supabaseClient.createAnalysis(predictionData);

      res.json({
        success: true,
        message: 'Trend predictions generated',
        topic,
        predictions
      });

    } catch (error) {
      logger.error('Trend predictions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate trend predictions'
      });
    }
  }

  // Get content opportunities from trends
  async getContentOpportunities(req, res) {
    try {
      const { industry, contentType = 'blog', limit = 10 } = req.query;
      const userId = req.user.id;

      // Get recent trends
      const recentTrends = await supabaseClient.getLatestTrends(50);

      // Filter trends by industry if specified
      const filteredTrends = industry 
        ? recentTrends.filter(trend => 
            trend.category === industry || 
            trend.keywords?.includes(industry)
          )
        : recentTrends;

      // Generate content opportunities
      const opportunities = await this.trendAnalyzer.generateContentOpportunities(
        filteredTrends.slice(0, parseInt(limit)), 
        contentType
      );

      res.json({
        success: true,
        message: 'Content opportunities generated',
        opportunities,
        industry,
        content_type: contentType,
        based_on_trends: filteredTrends.length
      });

    } catch (error) {
      logger.error('Content opportunities error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate content opportunities'
      });
    }
  }

  // Private helper methods
  getTimeframeCutoff(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '6h':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  async analyzeTrendData(trendData, query, userId) {
    const analyzedTrends = [];

    for (const trend of trendData) {
      try {
        // Save trend to database
        const trendRecord = {
          id: uuidv4(),
          keyword: trend.keyword || query,
          category: trend.category || 'general',
          trend_score: trend.score || 0,
          volume: trend.volume || 0,
          growth_rate: trend.growth || 0,
          source: trend.source || 'unknown',
          data: trend,
          created_at: new Date().toISOString()
        };

        const savedTrend = await supabaseClient.createTrend(trendRecord);
        analyzedTrends.push(savedTrend);

      } catch (error) {
        logger.warn('Failed to save trend:', error.message);
      }
    }

    return analyzedTrends;
  }

  async getHistoricalTrends(topic, timeframe) {
    try {
      const cutoffTime = this.getTimeframeCutoff(timeframe);
      
      const trends = await supabaseClient.query('trends', {
        filters: { keyword: topic },
        order: { column: 'created_at', ascending: true }
      });

      return trends.filter(trend => new Date(trend.created_at) >= cutoffTime);

    } catch (error) {
      logger.error('Error getting historical trends:', error);
      return [];
    }
  }
}

module.exports = ContentController;