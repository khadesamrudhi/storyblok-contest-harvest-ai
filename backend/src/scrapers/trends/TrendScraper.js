// src/scrapers/trends/TrendScraper.js

const { GoogleTrendsScraper } = require('./GoogleTrendsScraper');
const RedditScraper = require('./RedditScraper');
const NewsScraper = require('./NewsScraper');
const TwitterScraper = require('./TwitterScraper');
const logger = require('../../utils/logger');

class TrendScraper {
  constructor(options = {}) {
    this.googleTrendsScraper = new GoogleTrendsScraper(options.google || {});
    this.redditScraper = new RedditScraper(options.reddit || {});
    this.newsScraper = new NewsScraper(options.news || {});
    this.twitterScraper = new TwitterScraper(options.twitter || {});
  }

  async scrapeTrends(options = {}) {
    try {
      const sources = options.sources || ['google_trends'];
      const out = [];

      if (sources.includes('google_trends') || sources.includes('google')) {
        try {
          if (Array.isArray(options.keywords) && options.keywords.length) {
            for (const keyword of options.keywords) {
              const data = await this.googleTrendsScraper.searchTrends(
                keyword,
                options.timeframe || '7d',
                options.geo || 'US'
              );
              out.push({
                keyword: data.keyword,
                source: 'google_trends',
                trend_score: this._scoreGoogleInterest(data.interestOverTime),
                interest_over_time: data.interestOverTime,
                related_queries: data.relatedQueries,
                regional_interest: data.regionalInterest
              });
            }
          }
        } catch (e) {
          logger.warn('Google trends scraping error', e);
        }
      }

      if (sources.includes('reddit')) {
        try {
          const subreddits = options.subreddits || ['all'];
          for (const sub of subreddits) {
            const posts = await this.redditScraper.getHotPosts(sub, options.limit || 20);
            for (const p of posts) {
              out.push({
                keyword: p.title,
                source: 'reddit',
                subreddit: p.subreddit,
                trend_score: this._scoreReddit(p),
                url: p.url,
                comments: p.num_comments,
                upvotes: p.ups,
                created_utc: p.created_utc,
                author: p.author
              });
            }
          }
        } catch (e) {
          logger.warn('Reddit scraping error', e);
        }
      }

      if (sources.includes('news')) {
        try {
          const articles = await this.newsScraper.getTopHeadlines({
            country: options.country || 'us',
            category: options.category || 'general',
            limit: options.limit || 20
          });
          for (const a of articles) {
            out.push({
              keyword: a.title,
              source: 'news',
              trend_score: this._scoreNews(a),
              description: a.description,
              url: a.url,
              published_at: a.publishedAt,
              source_name: a.source?.name,
              author: a.author,
              category: options.category || 'general'
            });
          }
        } catch (e) {
          logger.warn('News scraping error', e);
        }
      }

      if (sources.includes('twitter')) {
        try {
          const tweets = await this.twitterScraper.getTrendingTopics(options.woeid || 1);
          for (const t of tweets) {
            out.push({
              keyword: t.name,
              source: 'twitter',
              trend_score: t.tweet_volume || 0,
              tweet_volume: t.tweet_volume || 0,
              url: t.url
            });
          }
        } catch (e) {
          logger.warn('Twitter scraping error', e);
        }
      }

      return { trends: out, scrapedAt: new Date().toISOString(), sources };
    } catch (error) {
      logger.error('TrendScraper.scrapeTrends failed', error);
      throw error;
    }
  }

  _scoreGoogleInterest(interest = []) {
    if (!Array.isArray(interest) || interest.length === 0) return 0;
    const values = interest.map(i => i.value || 0).filter(v => v > 0);
    if (!values.length) return 0;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const max = Math.max(...values);
    const recent = values.slice(-5);
    const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
    return Math.round((avg * 0.3 + max * 0.4 + recentAvg * 0.3) * 100) / 100;
  }

  _scoreReddit(post) {
    const ageHours = (Date.now() / 1000 - post.created_utc) / 3600;
    const hotness = post.ups / Math.pow(ageHours + 2, 1.5);
    const commentRatio = post.num_comments / (post.ups + 1);
    return Math.round((hotness * 1000 + commentRatio * 100) * 100) / 100;
  }

  _scoreNews(article) {
    const ageHours = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 3600);
    const recency = Math.max(0, 100 - ageHours * 2);
    const titleLen = (article.title || '').length;
    const lengthScore = Math.min(100, titleLen * 2);
    return Math.round((recency * 0.7 + lengthScore * 0.3) * 100) / 100;
  }
}

module.exports = { TrendScraper };
