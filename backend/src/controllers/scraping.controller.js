// src/controllers/scraping.controller.js

const logger = require('../utils/logger');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const { WebsiteScraper } = require('../scrapers/competitors/WebsiteScraper');
const { ContentScraper } = require('../scrapers/competitors/ContentScraper');
const { AssetScraper } = require('../scrapers/assets/AssetScraper');
const { TrendScraper } = require('../scrapers/trends/TrendScraper');

// Direct mode helpers (no Redis/Bull). Create DB job, run synchronously, update status.
async function createJobRecord({ userId, url, type, options }) {
  const job = {
    id: require('uuid').v4(),
    user_id: userId || null,
    competitor_id: options?.competitorId || null,
    type,
    status: 'pending',
    target_url: url || null,
    priority: options?.priority || 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  await supabaseClient.createScrapingJob(job);
  return job;
}

async function updateJob(jobId, patch) {
  return supabaseClient.updateScrapingJob(jobId, { ...patch, updated_at: new Date().toISOString() });
}

async function runDirect({ type, url, userId, options = {} }) {
  const job = await createJobRecord({ userId, url, type, options });
  try {
    await updateJob(job.id, { status: 'running', started_at: new Date().toISOString(), progress: 10 });

    let results;
    if (type === 'competitor_website') {
      const scraper = new WebsiteScraper();
      try {
        results = await scraper.scrapeWebsite(url);
      } finally {
        await scraper.closeBrowser();
      }
    } else if (type === 'content_analysis') {
      const scraper = new ContentScraper();
      try {
        results = await scraper.scrapeContent(url, options.contentType || 'blog');
      } finally {
        await scraper.closeBrowser();
      }
    } else if (type === 'asset_discovery') {
      const scraper = new AssetScraper();
      try {
        results = await scraper.scrapeAssets(url, options);
      } finally {
        await scraper.closeBrowser();
      }
    } else if (type === 'trend_monitoring') {
      const scraper = new TrendScraper();
      results = await scraper.scrapeTrends(options);
    } else {
      throw new Error(`Unknown scraping type: ${type}`);
    }

    await updateJob(job.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress: 100,
      results
    });

    if (global.socketHandlers) {
      try {
        global.socketHandlers.broadcastScrapingUpdate(
          job.id,
          userId || null,
          'completed',
          100,
          'Scraping completed successfully'
        );
      } catch {}
    }

    return { jobId: job.id, results };
  } catch (err) {
    await updateJob(job.id, {
      status: 'failed',
      error_message: err.message,
      completed_at: new Date().toISOString()
    });

    if (global.socketHandlers) {
      try {
        global.socketHandlers.broadcastScrapingUpdate(
          job.id,
          userId || null,
          'failed',
          0,
          `Scraping failed: ${err.message}`
        );
      } catch {}
    }
    throw err;
  }
}

module.exports = {
  // POST /api/scraping/enqueue
  async enqueue(req, res, next) {
    try {
      const { url, type = 'competitor_website', options = {} } = req.body || {};
      if (type !== 'trend_monitoring' && (!url || typeof url !== 'string')) {
        return res.status(400).json({ success: false, error: 'url is required for this type' });
      }
      const userId = req.user?.id || null;
      const result = await runDirect({ type, url, userId, options });
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      logger.error('scraping.enqueue failed', err);
      next(err);
    }
  },

  // GET /api/scraping/:id/status
  async status(req, res, next) {
    try {
      // Direct mode: return DB record if present, else info message
      const { id } = req.params;
      const jobs = await supabaseClient.query('scraping_jobs', { filters: { id }, limit: 1 });
      if (!jobs || jobs.length === 0) {
        return res.status(404).json({ success: false, error: 'job not found' });
      }
      res.json({ success: true, status: jobs[0] });
    } catch (err) {
      logger.error('scraping.status failed', err);
      next(err);
    }
  },

  // DELETE /api/scraping/:id
  async remove(req, res, next) {
    try {
      // Direct mode: delete DB record if exists
      const { id } = req.params;
      const jobs = await supabaseClient.query('scraping_jobs', { filters: { id }, limit: 1 });
      if (!jobs || jobs.length === 0) {
        return res.status(404).json({ success: false, error: 'job not found' });
      }
      await supabaseClient.getClient().from('scraping_jobs').delete().eq('id', id);
      res.json({ success: true, removed: true });
    } catch (err) {
      logger.error('scraping.remove failed', err);
      next(err);
    }
  },

  // GET /api/scraping/stats
  async stats(req, res, next) {
    try {
      // Direct mode: provide basic counts from DB
      const client = supabaseClient.getClient();
      const { data } = await client.from('scraping_jobs').select('*');
      const list = Array.isArray(data) ? data : [];
      const stats = {
        total: list.length,
        running: list.filter(j => j.status === 'running').length,
        pending: list.filter(j => j.status === 'pending').length,
        completed: list.filter(j => j.status === 'completed').length,
        failed: list.filter(j => j.status === 'failed').length
      };
      res.json({ success: true, stats, mode: 'direct' });
    } catch (err) {
      logger.error('scraping.stats failed', err);
      next(err);
    }
  },

  // POST /api/scraping/pause
  async pause(req, res, next) {
    try {
      res.json({ success: true, message: 'Direct mode: queue pause not applicable' });
    } catch (err) {
      logger.error('scraping.pause failed', err);
      next(err);
    }
  },

  // POST /api/scraping/resume
  async resume(req, res, next) {
    try {
      res.json({ success: true, message: 'Direct mode: queue resume not applicable' });
    } catch (err) {
      logger.error('scraping.resume failed', err);
      next(err);
    }
  }
};

