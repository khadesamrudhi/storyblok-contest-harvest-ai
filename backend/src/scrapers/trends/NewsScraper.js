// src/scrapers/trends/NewsScraper.js

const axios = require('axios');

class NewsScraper {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.NEWSAPI_KEY || '';
    this.baseUrl = 'https://newsapi.org/v2';
    this.timeout = options.timeout || 20000;
  }

  async getTopHeadlines({ country = 'us', category = 'general', limit = 20 } = {}) {
    if (!this.apiKey) {
      return [];
    }
    const url = `${this.baseUrl}/top-headlines`;
    const res = await axios.get(url, {
      params: { country, category, pageSize: Math.min(limit, 100) },
      headers: { 'X-Api-Key': this.apiKey },
      timeout: this.timeout
    });
    const articles = res.data?.articles || [];
    return articles.map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      publishedAt: a.publishedAt,
      source: { name: a.source?.name || '' },
      author: a.author
    }));
  }
}

module.exports = NewsScraper;

