// src/scrapers/scheduler/JobQueue.js

const { ScraperQueue } = require('../base/ScraperQueue');
const { supabaseClient } = require('../../integrations/storage/SupabaseClient');
const logger = require('../../utils/logger');

class JobQueue {
  constructor() {
    this.scraperQueue = new ScraperQueue();
  }

  async initialize() {
    await this.scraperQueue.initialize();
    logger.info('Job queue initialized');
  }

  async addJob(jobType, jobData, options = {}) {
    try {
      const job = await this.scraperQueue.addScrapingJob({
        type: jobType,
        ...jobData
      }, options);

      return {
        id: job.id,
        type: jobType,
        status: 'queued',
        data: jobData
      };

    } catch (error) {
      logger.error('Failed to add job to queue:', error);
      throw error;
    }
  }

  async getJobStatus(jobId) {
    try {
      return await this.scraperQueue.getJobStatus(jobId);
    } catch (error) {
      logger.error('Failed to get job status:', error);
      throw error;
    }
  }

  async cancelJob(jobId) {
    try {
      const success = await this.scraperQueue.removeJob(jobId);
      if (success) {
        // Update database status
        await supabaseClient.updateScrapingJob(jobId, {
          status: 'cancelled',
          updated_at: new Date().toISOString()
        });
      }
      return success;
    } catch (error) {
      logger.error('Failed to cancel job:', error);
      throw error;
    }
  }

  async getQueueInfo() {
    try {
      return await this.scraperQueue.getQueueStats();
    } catch (error) {
      logger.error('Failed to get queue info:', error);
      throw error;
    }
  }

  async pauseQueue() {
    await this.scraperQueue.pauseQueue();
  }

  async resumeQueue() {
    await this.scraperQueue.resumeQueue();
  }

  async close() {
    await this.scraperQueue.close();
  }
}

module.exports = { JobQueue };

