// src/services/scraping.service.js

const logger = require('../utils/logger');
const { TrendScraper } = require('../scrapers/trends/TrendScraper');

class ScrapingService {
  constructor() {
    this.trendScraper = new TrendScraper();
  }

  async scrapeTrends(options = {}) {
    try {
      return await this.trendScraper.scrapeTrends(options);
    } catch (err) {
      logger.error('ScrapingService.scrapeTrends failed', err);
      throw err;
    }
  }
}

module.exports = new ScrapingService();

