// src/scrapers/scheduler/ScrapingScheduler.js (no-op stub)

const logger = require('../../utils/logger');

class ScrapingScheduler {
  constructor() {}
  async initialize() {
    logger.warn('ScrapingScheduler.initialize(): no-op (scheduler disabled)');
    return this;
  }
  async scheduleCompetitorScraping() {
    logger.warn('scheduleCompetitorScraping(): no-op (scheduler disabled)');
    return { ok: false, disabled: true };
  }
  async scheduleTrendMonitoring() {
    logger.warn('scheduleTrendMonitoring(): no-op (scheduler disabled)');
    return { ok: false, disabled: true };
  }
  async performDailyCleanup() {
    logger.warn('performDailyCleanup(): no-op (scheduler disabled)');
    return { ok: false, disabled: true };
  }
  startAllTasks() {
    logger.warn('startAllTasks(): no-op (scheduler disabled)');
  }
  stopAllTasks() {
    logger.warn('stopAllTasks(): no-op (scheduler disabled)');
  }
async function initializeScrapingScheduler() {
  if (process.env.DISABLE_SCRAPING_SCHEDULER === 'true') {
    logger.warn('initializeScrapingScheduler(): disabled by env, returning null');
    return null;
  }
  const s = new ScrapingScheduler();
  return s.initialize();
}

module.exports = { ScrapingScheduler, initializeScrapingScheduler };
  async initialize() {
    try {
      if (this.directMode) {
        // Direct mode requested: skip Redis entirely
        this.setupPeriodicTasks();
        this.isInitialized = true;
        logger.info('Scraping scheduler initialized in direct mode (no Redis)');
        return;
      await this.scheduleCompetitorScraping('daily');
    }, { scheduled: false });

    // Weekly deep scraping (every Sunday at 3 AM)
    const weeklyTask = cron.schedule('0 3 * * 0', async () => {
      logger.info('Starting weekly deep scraping');
      await this.scheduleCompetitorScraping('weekly');
    }, { scheduled: false });

    // Hourly trend monitoring (every hour)
    const hourlyTrendTask = cron.schedule('0 * * * *', async () => {
      logger.info('Starting hourly trend monitoring');
      await this.scheduleTrendMonitoring();
    }, { scheduled: false });

    // Daily cleanup (every day at 1 AM)
    const cleanupTask = cron.schedule('0 1 * * *', async () => {
      logger.info('Starting daily cleanup');
      await this.performDailyCleanup();
    }, { scheduled: false });

    // Store tasks
    this.scheduledTasks.set('daily', dailyTask);
    this.scheduledTasks.set('weekly', weeklyTask);
    this.scheduledTasks.set('hourly_trends', hourlyTrendTask);
    this.scheduledTasks.set('cleanup', cleanupTask);

    // Start all tasks
    this.startAllTasks();
  }

  setupQueueProcessor() {
    this.scraperQueue.scrapingQueue.process('scrape', 5, async (job) => {
      return await this.processScrapingJob(job);
    });
  }

  async processScrapingJob(job) {
    const { id: jobId, type, url, userId, competitorId, options = {} } = job.data;
    
    try {
      // Update job status to running
      await supabaseClient.updateScrapingJob(jobId, {
        status: SCRAPING_STATUS.RUNNING,
        started_at: new Date().toISOString(),
        progress: 0
      });

      job.progress(10);

      let result;
      switch (type) {
        case 'competitor_website':
          result = await this.scrapeCompetitorWebsite(url, options, job);
          break;
        case 'content_analysis':
          result = await this.scrapeContentForAnalysis(url, options, job);
          break;
        case 'asset_discovery':
          result = await this.scrapeAssetsFromWebsite(url, options, job);
          break;
        case 'trend_monitoring':
          result = await this.scrapeTrendData(options, job);
          break;
        default:
          throw new Error(`Unknown scraping type: ${type}`);
      }

      job.progress(90);

      // Update job status to completed
      await supabaseClient.updateScrapingJob(jobId, {
        status: SCRAPING_STATUS.COMPLETED,
        completed_at: new Date().toISOString(),
        progress: 100,
        results: result
      });

      job.progress(100);

      // Notify via WebSocket if available
      if (global.socketHandlers) {
        global.socketHandlers.broadcastScrapingUpdate(
          jobId,
          userId,
          SCRAPING_STATUS.COMPLETED,
          100,
          'Scraping completed successfully'
        );
      }

      logger.info(`Scraping job ${jobId} completed successfully`);
      return result;

    } catch (error) {
      // Update job status to failed
      await supabaseClient.updateScrapingJob(jobId, {
        status: SCRAPING_STATUS.FAILED,
        error_message: error.message,
        completed_at: new Date().toISOString()
      });

      // Notify via WebSocket
      if (global.socketHandlers) {
        global.socketHandlers.broadcastScrapingUpdate(
          jobId,
          userId,
          SCRAPING_STATUS.FAILED,
          0,
          `Scraping failed: ${error.message}`
        );
      }

      logger.error(`Scraping job ${jobId} failed:`, error);
      throw error;
    }
  }

  async scrapeCompetitorWebsite(url, options, job) {
    const { WebsiteScraper } = require('../competitors/WebsiteScraper');
    const scraper = new WebsiteScraper();
    
    try {
      job.progress(20);
      const result = await scraper.scrapeWebsite(url);
      job.progress(80);
      
      return result;
    } finally {
      await scraper.closeBrowser();
    }
  }

  async scrapeContentForAnalysis(url, options, job) {
    const { ContentScraper } = require('../competitors/ContentScraper');
    const scraper = new ContentScraper();
    
    try {
      job.progress(20);
      const result = await scraper.scrapeContent(url, options.contentType);
      job.progress(80);
      
      return result;
    } finally {
      await scraper.closeBrowser();
    }
  }

  async scrapeAssetsFromWebsite(url, options, job) {
    const { AssetScraper } = require('../assets/AssetScraper');
    const scraper = new AssetScraper();
    
    try {
      job.progress(20);
      const result = await scraper.scrapeAssets(url, options);
      job.progress(80);
      
      return result;
    } finally {
      await scraper.closeBrowser();
    }
  }

  async scrapeTrendData(options, job) {
    const { TrendScraper } = require('../trends/TrendScraper');
    const scraper = new TrendScraper();
    
    try {
      job.progress(20);
      const result = await scraper.scrapeTrends(options);
      job.progress(80);
      
      return result;
    } finally {
      // Trend scraping might not use browser
    }
  }

  async scheduleCompetitorScraping(frequency = 'daily') {
    try {
      // Get all competitors that need scraping
      const competitors = await supabaseClient.query('competitors', {
        filters: { 
          status: 'active',
          scraping_frequency: frequency
        },
        order: { column: 'last_scraped', ascending: true }
      });

      logger.info(`Scheduling ${frequency} scraping for ${competitors.length} competitors`);

      for (const competitor of competitors) {
        // Check if there's already a pending/running job
        const existingJobs = await supabaseClient.query('scraping_jobs', {
          filters: {
            competitor_id: competitor.id,
            status: ['pending', 'running']
          },
          limit: 1
        });

        if (existingJobs.length === 0) {
          await this.scheduleScrapingJob({
            type: 'competitor_website',
            url: competitor.website,
            userId: competitor.user_id,
            competitorId: competitor.id,
            options: { frequency }
          });
        }
      }

    } catch (error) {
      logger.error('Failed to schedule competitor scraping:', error);
    }
  }

  async scheduleTrendMonitoring() {
    try {
      // Schedule trend monitoring jobs
      const trendKeywords = await this.getActiveTrendKeywords();
      
      for (const keyword of trendKeywords) {
        await this.scheduleScrapingJob({
          type: 'trend_monitoring',
          url: null,
          userId: null, // System job
          competitorId: null,
          options: { 
            keyword,
            sources: ['google_trends', 'twitter', 'reddit']
          }
        });
      }

    } catch (error) {
      logger.error('Failed to schedule trend monitoring:', error);
    }
  }

  async getActiveTrendKeywords() {
    try {
      // Get trending keywords from the last 24 hours
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const trends = await supabaseClient.query('trends', {
        filters: { 
          created_at: `gte.${cutoffTime.toISOString()}`
        },
        order: { column: 'trend_score', ascending: false },
        limit: 20
      });

      return trends.map(trend => trend.keyword);
    } catch (error) {
      logger.error('Failed to get active trend keywords:', error);
      return [];
    }
  }

  async scheduleScrapingJob(jobData, options = {}) {
    try {
      // Create database record first
      const scrapingJobData = {
        id: require('uuid').v4(),
        user_id: jobData.userId,
        competitor_id: jobData.competitorId,
        type: jobData.type,
        status: SCRAPING_STATUS.PENDING,
        target_url: jobData.url,
        priority: options.priority || 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const dbJob = await supabaseClient.createScrapingJob(scrapingJobData);

      // Add to queue
      const queueJob = await this.scraperQueue.addScrapingJob({
        id: dbJob.id,
        ...jobData
      }, {
        priority: options.priority || 5,
        delay: options.delay || 0,
        attempts: options.attempts || 3
      });

      logger.info(`Scheduled scraping job ${dbJob.id} for ${jobData.url}`);
      return { dbJob, queueJob };

    } catch (error) {
      logger.error('Failed to schedule scraping job:', error);
      throw error;
    }
  }

  async performDailyCleanup() {
    try {
      logger.info('Starting daily cleanup');

      // Clean old completed jobs (older than 30 days)
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { error } = await supabaseClient.getClient()
        .from('scraping_jobs')
        .delete()
        .eq('status', 'completed')
        .lt('completed_at', cutoffDate.toISOString());

      if (error) {
        logger.error('Failed to clean old jobs:', error);
      } else {
        logger.info('Cleaned old completed jobs');
      }

      // Clean queue
      await this.scraperQueue.cleanQueue(24 * 60 * 60 * 1000); // 24 hours

      // Clean old scraped files
      const { ScraperUtils } = require('../base/ScraperUtils');
      await ScraperUtils.cleanOldFiles(7); // 7 days

      logger.info('Daily cleanup completed');

    } catch (error) {
      logger.error('Failed to perform daily cleanup:', error);
    }
  }

  startAllTasks() {
    this.scheduledTasks.forEach((task, name) => {
      task.start();
      logger.info(`Started scheduled task: ${name}`);
    });
  }

  stopAllTasks() {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.info(`Stopped scheduled task: ${name}`);
    });
  }

  async getSchedulerStats() {
    try {
      const queueStats = await this.scraperQueue.getQueueStats();
      
      const activeJobs = await supabaseClient.query('scraping_jobs', {
        filters: { status: 'running' }
      });

      const pendingJobs = await supabaseClient.query('scraping_jobs', {
        filters: { status: 'pending' }
      });

      const completedToday = await supabaseClient.query('scraping_jobs', {
        filters: { 
          status: 'completed',
          completed_at: `gte.${new Date().toISOString().split('T')[0]}T00:00:00.000Z`
        }
      });

      return {
        queue: queueStats,
        database: {
          active: activeJobs.length,
          pending: pendingJobs.length,
          completedToday: completedToday.length
        },
        scheduledTasks: Array.from(this.scheduledTasks.keys()).map(name => ({
          name,
          running: this.scheduledTasks.get(name).running
        }))
      };

    } catch (error) {
      logger.error('Failed to get scheduler stats:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.stopAllTasks();
      
      if (this.scraperQueue) {
        await this.scraperQueue.close();
      }
      logger.info('Scraping scheduler shut down gracefully');
    } catch (error) {
      logger.error('Error during scheduler shutdown:', error);
    }
  }

// Initialize the scheduler
async function initializeScrapingScheduler() {
  try {
    // Allow disabling scheduler in environments without Redis
    if (process.env.DISABLE_SCRAPING_SCHEDULER === 'true') {
      logger.warn('Scraping scheduler disabled via DISABLE_SCRAPING_SCHEDULER=true');
      return null;
    }
    // If no Redis config is provided and default localhost is not available, allow graceful skip
    const hasRedisEnv = process.env.REDIS_URL || process.env.REDIS_HOST || process.env.REDIS_PORT;
    if (!hasRedisEnv) {
      logger.warn('No Redis configuration found. Skipping scraping scheduler initialization. Set REDIS_URL or REDIS_HOST/REDIS_PORT to enable.');
      return null;
    }
    const scheduler = new ScrapingScheduler();
    await scheduler.initialize();
    
    // Make scheduler available globally
    global.scrapingScheduler = scheduler;
    
    return scheduler;
  } catch (error) {
    logger.error('Failed to initialize scraping scheduler:', error);
    // Do not crash the server if Redis is unavailable in dev/test
    logger.warn('Continuing without scraping scheduler. Ensure Redis is running to enable this feature.');
    return null;
  }
}

module.exports = {
  ScrapingScheduler,
  initializeScrapingScheduler
};