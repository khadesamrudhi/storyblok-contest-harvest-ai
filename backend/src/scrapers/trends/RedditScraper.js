// src/scrapers/trends/RedditScraper.js

const axios = require('axios');

class RedditScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://www.reddit.com';
    this.timeout = options.timeout || 20000;
    this.userAgent = options.userAgent || 'contest-harvest-ai/1.0';
  }

  async getHotPosts(subreddit = 'all', limit = 20) {
    const url = `${this.baseUrl}/r/${encodeURIComponent(subreddit)}/hot.json?limit=${Math.min(limit, 100)}`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': this.userAgent },
      timeout: this.timeout
    });
    const children = res.data?.data?.children || [];
    return children.map(c => {
      const d = c.data || {};
      return {
        title: d.title,
        subreddit: d.subreddit,
        num_comments: d.num_comments,
        ups: d.ups,
        created_utc: d.created_utc,
        url: d.url_overridden_by_dest || d.url,
        author: d.author
      };
    });
  }
}

module.exports = RedditScraper;

