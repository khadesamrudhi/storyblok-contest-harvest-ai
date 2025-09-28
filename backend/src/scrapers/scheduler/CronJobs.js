// src/scrapers/scheduler/CronJobs.js
// Centralized cron job scheduler using node-cron with start/stop/status controls

const cron = require('node-cron');
const logger = require('../../utils/logger');

// Jobs: import the correct named exports implemented in jobs/*
const { runDailyCompetitorScraping, runWeeklyCompetitorScraping, runHourlyTrendMonitoring, runCleanupNow } = require('../../jobs/scheduledScraping');
const { runTrendAnalysisJob } = require('../../jobs/trendAnalysis');
const { generateDailyReport } = require('../../jobs/reportGeneration');

class CronJobs {
  constructor() {
    this.jobs = new Map();
  }

  schedule(name, expression, fn) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).stop();
    }
    const task = cron.schedule(expression, async () => {
      try {
        logger.info(`[CRON] Running job: ${name}`);
        await fn();
        logger.info(`[CRON] Completed job: ${name}`);
      } catch (error) {
        logger.error(`[CRON] Job failed: ${name}`, error);
      }
    }, { scheduled: false });
    this.jobs.set(name, task);
    return task;
  }

  startAll() {
    this.jobs.forEach((task, name) => {
      if (!task.running) task.start();
      logger.info(`[CRON] Started: ${name}`);
    });
  }

  stopAll() {
    this.jobs.forEach((task, name) => {
      if (task.running) task.stop();
      logger.info(`[CRON] Stopped: ${name}`);
    });
  }

  status() {
    const out = [];
    this.jobs.forEach((task, name) => {
      out.push({ name, running: task.running || false });
    });
    return out;
  }
}

function initializeCronJobs() {
  const cj = new CronJobs();

  // Daily competitor scraping at 2:00 AM
  cj.schedule('daily_competitor_scraping', '0 2 * * *', () => runDailyCompetitorScraping());

  // Weekly scraping at 3:00 AM on Sundays
  cj.schedule('weekly_competitor_scraping', '0 3 * * 0', () => runWeeklyCompetitorScraping());

  // Hourly trend monitoring
  cj.schedule('hourly_trend_monitoring', '0 * * * *', () => runHourlyTrendMonitoring());

  // Daily trend analysis at 3:30 AM (persist optional via options)
  cj.schedule('daily_trend_analysis', '30 3 * * *', () => runTrendAnalysisJob({ limit: 20, category: 'general' }));

  // Daily cleanup at 1:00 AM
  cj.schedule('daily_cleanup', '0 1 * * *', () => runCleanupNow());

  // Daily report at 6:00 AM
  cj.schedule('daily_report', '0 6 * * *', () => generateDailyReport({ date: new Date() }));

  // Start all scheduled tasks
  cj.startAll();

  return cj;
}

module.exports = {
  CronJobs,
  initializeCronJobs
};
