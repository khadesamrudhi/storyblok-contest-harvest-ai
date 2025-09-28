// src/jobs/scheduledScraping.js

const logger = require('../utils/logger');
// Lazily require the scheduler only when enabled
function getInitializer() {
  if (process.env.DISABLE_SCRAPING_SCHEDULER === 'true') return null;
  // Require here to avoid parsing the file when disabled
  // eslint-disable-next-line global-require
  const { initializeScrapingScheduler } = require('../scrapers/scheduler/ScrapingScheduler');
  return initializeScrapingScheduler;
}

async function getScheduler() {
  if (global.scrapingScheduler) return global.scrapingScheduler;
  const init = getInitializer();
  if (!init) {
    logger.warn('Scheduler disabled by env; scheduled jobs are no-ops');
    return null;
  }
  const scheduler = await init();
  return scheduler;
}

// Trigger daily competitor scraping now
async function runDailyCompetitorScraping() {
  const scheduler = await getScheduler();
  logger.info('Job: runDailyCompetitorScraping');
  return scheduler.scheduleCompetitorScraping('daily');
}

// Trigger weekly competitor scraping now
async function runWeeklyCompetitorScraping() {
  const scheduler = await getScheduler();
  logger.info('Job: runWeeklyCompetitorScraping');
  return scheduler.scheduleCompetitorScraping('weekly');
}

// Trigger trend monitoring now
async function runHourlyTrendMonitoring() {
  const scheduler = await getScheduler();
  logger.info('Job: runHourlyTrendMonitoring');
  return scheduler.scheduleTrendMonitoring();
}

// Run cleanup immediately
async function runCleanupNow() {
  const scheduler = await getScheduler();
  logger.info('Job: runCleanupNow');
  return scheduler.performDailyCleanup();
}

// Start all cron tasks (idempotent)
async function scheduleAll() {
  const scheduler = await getScheduler();
  logger.info('Job: scheduleAll (start all cron tasks)');
  scheduler.startAllTasks();
  return { ok: true };
}

module.exports = {
  runDailyCompetitorScraping,
  runWeeklyCompetitorScraping,
  runHourlyTrendMonitoring,
  runCleanupNow,
  scheduleAll
};

