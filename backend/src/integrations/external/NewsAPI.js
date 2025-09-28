// src/integrations/external/NewsAPI.js

const axios = require('axios');
const logger = require('../../utils/logger');

class NewsAPIClient {
  constructor() {
    this.apiKey = process.env.NEWSAPI_KEY || process.env.NEWS_API_KEY || null;
    this.client = axios.create({
      baseURL: 'https://newsapi.org/v2',
      timeout: Number(process.env.NEWSAPI_TIMEOUT_MS || 15000)
    });
  }

  ensureKey() {
    if (!this.apiKey) throw new Error('NEWSAPI_KEY is not configured');
  }

  // GET /top-headlines
  async topHeadlines({ country = 'us', category, q, page = 1, pageSize = 20, sources } = {}) {
    this.ensureKey();
    try {
      const params = {
        apiKey: this.apiKey,
        country,
        page: Number(page),
        pageSize: Math.min(Number(pageSize), 100),
        ...(category ? { category } : {}),
        ...(q ? { q } : {}),
        ...(sources ? { sources } : {})
      };
      const { data } = await this.client.get('/top-headlines', { params });
      return data;
    } catch (err) {
      logger.error('NewsAPI.topHeadlines failed', { error: err.response?.data || err.message });
      throw err;
    }
  }

  // GET /everything
  async searchEverything({ q, from, to, sortBy = 'publishedAt', language = 'en', page = 1, pageSize = 20 } = {}) {
    this.ensureKey();
    try {
      const params = {
        apiKey: this.apiKey,
        q: q || '*',
        sortBy,
        language,
        page: Number(page),
        pageSize: Math.min(Number(pageSize), 100),
        ...(from ? { from } : {}),
        ...(to ? { to } : {})
      };
      const { data } = await this.client.get('/everything', { params });
      return data;
    } catch (err) {
      logger.error('NewsAPI.searchEverything failed', { error: err.response?.data || err.message });
      throw err;
    }
  }
}

module.exports = new NewsAPIClient();

