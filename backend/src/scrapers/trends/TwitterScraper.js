// src/scrapers/trends/TwitterScraper.js

const axios = require('axios');

class TwitterScraper {
  constructor(options = {}) {
    this.bearerToken = options.bearerToken || process.env.TWITTER_BEARER_TOKEN || '';
    this.timeout = options.timeout || 20000;
  }

  async getTrendingTopics(woeid = 1) {
    if (!this.bearerToken) return [];
    // Twitter API v1.1: GET trends/place.json?id=WOEID
    const url = `https://api.twitter.com/1.1/trends/place.json`;
    const res = await axios.get(url, {
      params: { id: woeid },
      headers: { Authorization: `Bearer ${this.bearerToken}` },
      timeout: this.timeout
    });
    const arr = Array.isArray(res.data) ? res.data : [];
    const trends = arr[0]?.trends || [];
    return trends.map(t => ({
      name: t.name,
      url: t.url,
      tweet_volume: t.tweet_volume
    }));
  }
}

module.exports = TwitterScraper;

