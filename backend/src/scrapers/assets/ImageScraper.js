// src/scrapers/assets/ImageScraper.js

const BaseScraper = require('../base/BaseScraper');
const sharp = require('sharp');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');
const { ScraperUtils } = require('../base/ScraperUtils');

class ImageScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    this.downloadedImages = new Map();
  }

  async respectRateLimit() {
    const minInterval = 2000; // 2 seconds between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      logger.info(`Rate limiting: waiting ${waitTime}ms for Google Trends`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  async getMultipleTrends(keywords, timeframe = '7d', geo = 'US') {
    const results = [];
    
    for (const keyword of keywords) {
      try {
        const result = await this.searchTrends(keyword, timeframe, geo);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to get trends for ${keyword}:`, error);
        results.push({
          keyword,
          error: error.message,
          source: 'google_trends',
          scrapedAt: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  async compareTrends(keywords, timeframe = '7d', geo = 'US') {
    try {
      await this.respectRateLimit();
      
      const result = await googleTrends.interestOverTime({
        keyword: keywords,
        startTime: this.getStartTime(timeframe),
        geo
      });

      const data = JSON.parse(result);
      return this.parseComparisonData(data, keywords);

    } catch (error) {
      logger.error('Failed to compare trends:', error);
      throw error;
    }
  }

  parseComparisonData(data, keywords) {
    if (!data.default || !data.default.timelineData) {
      return [];
    }

    return data.default.timelineData.map(item => {
      const timePoint = {
        time: item.formattedTime,
        values: {}
      };

      keywords.forEach((keyword, index) => {
        timePoint.values[keyword] = item.value[index] || 0;
      });

      return timePoint;
    });
  }
}

// src/scrapers/trends/TrendScraper.js

const GoogleTrendsScraper = require('./GoogleTrendsScraper');
const axios = require('axios');
const logger = require('../../utils/logger');

class TrendScraper {
  constructor() {
    this.googleTrendsScraper = new GoogleTrendsScraper();
  }

  async scrapeTrends(options = {}) {
    try {
      const trendData = [];

      // Google Trends
      if (options.sources?.includes('google') || !options.sources) {
        const googleTrends = await this.scrapeGoogleTrends(options);
        trendData.push(...googleTrends);
      }

      // Reddit Trends
      if (options.sources?.includes('reddit')) {
        const redditTrends = await this.scrapeRedditTrends(options);
        trendData.push(...redditTrends);
      }

      // News Trends
      if (options.sources?.includes('news')) {
        const newsTrends = await this.scrapeNewsTrends(options);
        trendData.push(...newsTrends);
      }

      return {
        trends: trendData,
        scrapedAt: new Date().toISOString(),
        sources: options.sources || ['google'],
        totalCount: trendData.length
      };

    } catch (error) {
      logger.error('Trend scraping failed:', error);
      throw error;
    }
  }

  async scrapeGoogleTrends(options) {
    try {
      const trends = [];
      
      if (options.keywords && Array.isArray(options.keywords)) {
        // Scrape specific keywords
        const results = await this.googleTrendsScraper.getMultipleTrends(
          options.keywords,
          options.timeframe,
          options.geo
        );
        
        results.forEach(result => {
          if (!result.error) {
            trends.push({
              keyword: result.keyword,
              source: 'google_trends',
              trend_score: this.calculateTrendScore(result.interestOverTime),
              interest_data: result.interestOverTime,
              related_queries: result.relatedQueries,
              regional_interest: result.regionalInterest,
              timeframe: options.timeframe,
              geo: options.geo
            });
          }
        });
      }

      return trends;
    } catch (error) {
      logger.error('Google Trends scraping failed:', error);
      return [];
    }
  }

  async scrapeRedditTrends(options) {
    try {
      const trends = [];
      const subreddits = options.subreddits || ['all', 'popular', 'trending'];
      
      for (const subreddit of subreddits) {
        const posts = await this.getRedditHotPosts(subreddit, options.limit || 25);
        
        posts.forEach(post => {
          trends.push({
            keyword: post.title,
            source: 'reddit',
            subreddit: post.subreddit,
            trend_score: this.calculateRedditTrendScore(post),
            url: post.url,
            comments: post.num_comments,
            upvotes: post.ups,
            created_utc: post.created_utc,
            author: post.author
          });
        });
      }

      return trends;
    } catch (error) {
      logger.error('Reddit trends scraping failed:', error);
      return [];
    }
  }

  async getRedditHotPosts(subreddit, limit = 25) {
    try {
      const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json`, {
        params: { limit },
        headers: {
          'User-Agent': 'ContentHarvest-AI/1.0'
        }
      });

      return response.data.data.children.map(child => child.data);
    } catch (error) {
      logger.error(`Failed to get Reddit posts for r/${subreddit}:`, error);
      return [];
    }
  }

  async scrapeNewsTrends(options) {
    try {
      const trends = [];
      
      // Using News API (if available)
      if (process.env.NEWS_API_KEY) {
        const headlines = await this.getNewsHeadlines(options);
        
        headlines.forEach(article => {
          trends.push({
            keyword: article.title,
            source: 'news',
            trend_score: this.calculateNewsTrendScore(article),
            description: article.description,
            url: article.url,
            published_at: article.publishedAt,
            source_name: article.source.name,
            author: article.author,
            category: options.category || 'general'
          });
        });
      }

      return trends;
    } catch (error) {
      logger.error('News trends scraping failed:', error);
      return [];
    }
  }

  async getNewsHeadlines(options) {
    try {
      const response = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          apiKey: process.env.NEWS_API_KEY,
          country: options.country || 'us',
          category: options.category || 'general',
          pageSize: options.limit || 20
        }
      });

      return response.data.articles || [];
    } catch (error) {
      logger.error('Failed to get news headlines:', error);
      return [];
    }
  }

  calculateTrendScore(interestData) {
    if (!interestData || interestData.length === 0) return 0;
    
    const values = interestData.map(item => item.value).filter(val => val > 0);
    if (values.length === 0) return 0;

    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const max = Math.max(...values);
    const recent = values.slice(-5); // Last 5 data points
    const recentAverage = recent.reduce((sum, val) => sum + val, 0) / recent.length;

    // Combine average, max, and recent trend
    return Math.round((average * 0.3 + max * 0.4 + recentAverage * 0.3) * 100) / 100;
  }

  calculateRedditTrendScore(post) {
    const ageHours = (Date.now() / 1000 - post.created_utc) / 3600;
    const hotnessScore = post.ups / Math.pow(ageHours + 2, 1.5);
    const commentRatio = post.num_comments / (post.ups + 1);
    
    return Math.round((hotnessScore * 1000 + commentRatio * 100) * 100) / 100;
  }

  calculateNewsTrendScore(article) {
    const ageHours = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 3600);
    const recencyScore = Math.max(0, 100 - ageHours * 2); // Decreases over time
    const titleLength = article.title.length;
    const lengthScore = Math.min(100, titleLength * 2); // Longer titles might be more detailed
    
    return Math.round((recencyScore * 0.7 + lengthScore * 0.3) * 100) / 100;
  }

  async getTopTrendingKeywords(options = {}) {
    try {
      const trends = await this.scrapeTrends(options);
      
      // Sort by trend score and return top keywords
      const sortedTrends = trends.trends
        .sort((a, b) => b.trend_score - a.trend_score)
        .slice(0, options.limit || 10);

      return sortedTrends.map(trend => ({
        keyword: trend.keyword,
        source: trend.source,
        trend_score: trend.trend_score
      }));

    } catch (error) {
      logger.error('Failed to get top trending keywords:', error);
      throw error;
    }
  }

  async monitorKeywordTrends(keywords, options = {}) {
    try {
      const monitoringData = {
        keywords,
        timestamp: new Date().toISOString(),
        trends: []
      };

      // Get current trend data for all keywords
      for (const keyword of keywords) {
        const trendData = await this.googleTrendsScraper.searchTrends(
          keyword,
          options.timeframe || '7d',
          options.geo || 'US'
        );
        
        monitoringData.trends.push({
          keyword,
          trend_score: this.calculateTrendScore(trendData.interestOverTime),
          interest_data: trendData.interestOverTime,
          related_queries: trendData.relatedQueries
        });
      }

      return monitoringData;
    } catch (error) {
      logger.error('Keyword trend monitoring failed:', error);
      throw error;
    }
  }
}

module.exports = {
  ImageScraper,
  AssetScraper,
  GoogleTrendsScraper,
  TrendScraper
};

  async scrapeImages(url, options = {}) {
    try {
      logger.info(`Starting image scraping for: ${url}`);
      
      const $ = await this.scrapeWithPuppeteer(url);
      
      const images = this.extractImages($, url);
      const filteredImages = this.filterImages(images, options);
      
      if (options.downloadImages) {
        const downloadedImages = await this.downloadImages(filteredImages, options);
        return downloadedImages;
      }
      
      return filteredImages;

    } catch (error) {
      logger.error(`Image scraping failed for ${url}:`, error);
      throw error;
    }
  }

  extractImages($, baseUrl) {
    const images = [];
    
    // Regular img tags
    $('img').each((i, el) => {
      const $img = $(el);
      const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy');
      
      if (src) {
        const fullUrl = ScraperUtils.normalizeUrl(src, baseUrl);
        images.push({
          url: fullUrl,
          alt: $img.attr('alt') || '',
          title: $img.attr('title') || '',
          width: $img.attr('width'),
          height: $img.attr('height'),
          className: $img.attr('class') || '',
          context: this.getImageContext($img),
          type: 'img'
        });
      }
    });

    // CSS background images
    $('*').each((i, el) => {
      const $el = $(el);
      const style = $el.attr('style');
      
      if (style && style.includes('background-image')) {
        const matches = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
        if (matches) {
          const fullUrl = ScraperUtils.normalizeUrl(matches[1], baseUrl);
          images.push({
            url: fullUrl,
            alt: $el.attr('aria-label') || '',
            title: $el.attr('title') || '',
            className: $el.attr('class') || '',
            context: this.getImageContext($el),
            type: 'background'
          });
        }
      }
    });

    // Picture elements
    $('picture source').each((i, el) => {
      const $source = $(el);
      const srcset = $source.attr('srcset');
      
      if (srcset) {
        const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
        urls.forEach(url => {
          const fullUrl = ScraperUtils.normalizeUrl(url, baseUrl);
          images.push({
            url: fullUrl,
            alt: $source.closest('picture').find('img').attr('alt') || '',
            title: $source.attr('title') || '',
            media: $source.attr('media') || '',
            context: this.getImageContext($source),
            type: 'picture'
          });
        });
      }
    });

    return this.deduplicateImages(images);
  }

  getImageContext($img) {
    const context = {
      inHeader: $img.closest('header, .header').length > 0,
      inNav: $img.closest('nav, .nav, .navigation').length > 0,
      inFooter: $img.closest('footer, .footer').length > 0,
      inArticle: $img.closest('article, .article, .post, .content').length > 0,
      inSidebar: $img.closest('aside, .sidebar').length > 0,
      nearText: false
    };

    // Check if image is near text content
    const parent = $img.parent();
    const siblings = parent.siblings();
    const textContent = parent.text().trim() + siblings.text().trim();
    context.nearText = textContent.length > 50;

    return context;
  }

  filterImages(images, options = {}) {
    let filtered = images;

    // Filter by minimum dimensions
    if (options.minWidth || options.minHeight) {
      filtered = filtered.filter(img => {
        const width = parseInt(img.width) || 0;
        const height = parseInt(img.height) || 0;
        return width >= (options.minWidth || 0) && height >= (options.minHeight || 0);
      });
    }

    // Filter by context
    if (options.excludeNavigation) {
      filtered = filtered.filter(img => !img.context.inNav);
    }

    if (options.excludeHeader) {
      filtered = filtered.filter(img => !img.context.inHeader);
    }

    if (options.excludeFooter) {
      filtered = filtered.filter(img => !img.context.inFooter);
    }

    if (options.contentImagesOnly) {
      filtered = filtered.filter(img => 
        img.context.inArticle || img.context.nearText
      );
    }

    // Filter by file type
    if (options.allowedTypes) {
      const allowedTypes = options.allowedTypes.map(type => type.toLowerCase());
      filtered = filtered.filter(img => {
        const extension = path.extname(img.url).toLowerCase().substring(1);
        return allowedTypes.includes(extension);
      });
    }

    // Filter out common icons and small images
    if (options.excludeSmallImages !== false) {
      filtered = filtered.filter(img => {
        const url = img.url.toLowerCase();
        const isIcon = url.includes('icon') || url.includes('favicon') || 
                      url.includes('logo') && (img.width < 100 || img.height < 100);
        return !isIcon;
      });
    }

    return filtered;
  }

  deduplicateImages(images) {
    const seen = new Set();
    return images.filter(img => {
      const key = img.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async downloadImages(images, options = {}) {
    const downloadDir = options.downloadDir || path.join(process.cwd(), 'downloads', 'images');
    await fs.mkdir(downloadDir, { recursive: true });

    const downloadedImages = [];
    const maxConcurrent = options.maxConcurrent || 5;
    
    // Process images in batches
    for (let i = 0; i < images.length; i += maxConcurrent) {
      const batch = images.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(
        batch.map(img => this.downloadImage(img, downloadDir, options))
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          downloadedImages.push(result.value);
        } else {
          logger.warn(`Failed to download image ${batch[index].url}:`, result.reason);
        }
      });
    }

    return downloadedImages;
  }

  async downloadImage(image, downloadDir, options = {}) {
    try {
      const response = await axios.get(image.url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': ScraperUtils.generateUserAgent()
        }
      });

      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const buffer = Buffer.from(response.data);
      const filename = ScraperUtils.generateFileName(image.url, this.getFileExtension(contentType));
      const filePath = path.join(downloadDir, filename);

      // Get image metadata
      let metadata = {};
      try {
        const sharpImage = sharp(buffer);
        metadata = await sharpImage.metadata();
      } catch (error) {
        logger.warn('Failed to get image metadata:', error);
      }

      // Optimize image if requested
      let finalBuffer = buffer;
      if (options.optimize) {
        try {
          finalBuffer = await this.optimizeImage(buffer, options);
        } catch (error) {
          logger.warn('Failed to optimize image, using original:', error);
        }
      }

      await fs.writeFile(filePath, finalBuffer);

      return {
        ...image,
        localPath: filePath,
        filename,
        size: finalBuffer.length,
        metadata,
        downloadedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Failed to download image ${image.url}:`, error);
      throw error;
    }
  }

  async optimizeImage(buffer, options = {}) {
    const sharpImage = sharp(buffer);
    const metadata = await sharpImage.metadata();

    // Resize if too large
    if (options.maxWidth || options.maxHeight) {
      sharpImage.resize({
        width: options.maxWidth,
        height: options.maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert format if specified
    if (options.format) {
      switch (options.format.toLowerCase()) {
        case 'webp':
          sharpImage.webp({ quality: options.quality || 80 });
          break;
        case 'jpeg':
        case 'jpg':
          sharpImage.jpeg({ quality: options.quality || 80 });
          break;
        case 'png':
          sharpImage.png({ quality: options.quality || 80 });
          break;
      }
    }

    return await sharpImage.toBuffer();
  }

  getFileExtension(contentType) {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp'
    };
    
    return extensions[contentType] || '.jpg';
  }
}

// src/scrapers/assets/AssetScraper.js

const BaseScraper = require('../base/BaseScraper');
const ImageScraper = require('./ImageScraper');
const logger = require('../../utils/logger');

class AssetScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    this.imageScraper = new ImageScraper(options);
  }

  async scrapeAssets(url, options = {}) {
    try {
      logger.info(`Starting asset scraping for: ${url}`);
      
      const assets = {
        images: [],
        videos: [],
        documents: [],
        audio: [],
        other: []
      };

      // Scrape images
      if (options.includeImages !== false) {
        assets.images = await this.imageScraper.scrapeImages(url, {
          ...options,
          downloadImages: options.downloadAssets
        });
      }

      // Scrape other assets
      const $ = await this.scrapeWithPuppeteer(url);
      
      if (options.includeVideos) {
        assets.videos = this.extractVideos($, url);
      }
      
      if (options.includeDocuments) {
        assets.documents = this.extractDocuments($, url);
      }
      
      if (options.includeAudio) {
        assets.audio = this.extractAudio($, url);
      }

      return assets;

    } catch (error) {
      logger.error(`Asset scraping failed for ${url}:`, error);
      throw error;
    }
  }

  extractVideos($, baseUrl) {
    const videos = [];
    
    // Video tags
    $('video').each((i, el) => {
      const $video = $(el);
      const src = $video.attr('src');
      const poster = $video.attr('poster');
      
      if (src) {
        videos.push({
          url: new URL(src, baseUrl).href,
          poster: poster ? new URL(poster, baseUrl).href : null,
          type: 'video',
          width: $video.attr('width'),
          height: $video.attr('height'),
          controls: $video.attr('controls') !== undefined,
          autoplay: $video.attr('autoplay') !== undefined
        });
      }

      // Source tags within video
      $video.find('source').each((j, source) => {
        const $source = $(source);
        const sourceSrc = $source.attr('src');
        if (sourceSrc) {
          videos.push({
            url: new URL(sourceSrc, baseUrl).href,
            type: 'video',
            mimeType: $source.attr('type'),
            media: $source.attr('media')
          });
        }
      });
    });

    // Embedded videos (YouTube, Vimeo, etc.)
    $('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]').each((i, el) => {
      const $iframe = $(el);
      const src = $iframe.attr('src');
      
      if (src) {
        videos.push({
          url: src,
          type: 'embedded_video',
          platform: this.detectVideoPlatform(src),
          width: $iframe.attr('width'),
          height: $iframe.attr('height')
        });
      }
    });

    return videos;
  }

  extractDocuments($, baseUrl) {
    const documents = [];
    const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'];
    
    $('a[href]').each((i, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      
      if (href) {
        const extension = path.extname(href.toLowerCase());
        if (docExtensions.includes(extension)) {
          documents.push({
            url: new URL(href, baseUrl).href,
            type: 'document',
            extension,
            text: $link.text().trim(),
            title: $link.attr('title') || ''
          });
        }
      }
    });

    return documents;
  }

  extractAudio($, baseUrl) {
    const audio = [];
    
    // Audio tags
    $('audio').each((i, el) => {
      const $audio = $(el);
      const src = $audio.attr('src');
      
      if (src) {
        audio.push({
          url: new URL(src, baseUrl).href,
          type: 'audio',
          controls: $audio.attr('controls') !== undefined,
          autoplay: $audio.attr('autoplay') !== undefined,
          loop: $audio.attr('loop') !== undefined
        });
      }

      // Source tags within audio
      $audio.find('source').each((j, source) => {
        const $source = $(source);
        const sourceSrc = $source.attr('src');
        if (sourceSrc) {
          audio.push({
            url: new URL(sourceSrc, baseUrl).href,
            type: 'audio',
            mimeType: $source.attr('type')
          });
        }
      });
    });

    return audio;
  }

  detectVideoPlatform(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'vimeo';
    }
    if (url.includes('dailymotion.com')) {
      return 'dailymotion';
    }
    if (url.includes('twitch.tv')) {
      return 'twitch';
    }
    return 'unknown';
  }
}

// src/scrapers/trends/GoogleTrendsScraper.js

const googleTrends = require('google-trends-api');
const logger = require('../../utils/logger');

class GoogleTrendsScraper {
  constructor() {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  async searchTrends(keyword, timeframe = '7d', geo = 'US') {
    try {
      await this.respectRateLimit();
      
      logger.info(`Searching Google Trends for: ${keyword}`);
      
      // Get interest over time
      const interestOverTime = await this.getInterestOverTime(keyword, timeframe, geo);
      
      // Get related queries
      const relatedQueries = await this.getRelatedQueries(keyword, timeframe, geo);
      
      // Get regional interest
      const regionalInterest = await this.getRegionalInterest(keyword, timeframe);
      
      return {
        keyword,
        timeframe,
        geo,
        interestOverTime,
        relatedQueries,
        regionalInterest,
        source: 'google_trends',
        scrapedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Google Trends search failed for ${keyword}:`, error);
      throw error;
    }
  }

  async getInterestOverTime(keyword, timeframe, geo) {
    try {
      const result = await googleTrends.interestOverTime({
        keyword,
        startTime: this.getStartTime(timeframe),
        geo,
        granularTimeResolution: true
      });

      const data = JSON.parse(result);
      return this.parseInterestOverTime(data);

    } catch (error) {
      logger.error('Failed to get interest over time:', error);
      return [];
    }
  }

  async getRelatedQueries(keyword, timeframe, geo) {
    try {
      const result = await googleTrends.relatedQueries({
        keyword,
        startTime: this.getStartTime(timeframe),
        geo
      });

      const data = JSON.parse(result);
      return this.parseRelatedQueries(data);

    } catch (error) {
      logger.error('Failed to get related queries:', error);
      return [];
    }
  }

  async getRegionalInterest(keyword, timeframe) {
    try {
      const result = await googleTrends.interestByRegion({
        keyword,
        startTime: this.getStartTime(timeframe),
        resolution: 'COUNTRY'
      });

      const data = JSON.parse(result);
      return this.parseRegionalInterest(data);

    } catch (error) {
      logger.error('Failed to get regional interest:', error);
      return [];
    }
  }

  parseInterestOverTime(data) {
    if (!data.default || !data.default.timelineData) {
      return [];
    }

    return data.default.timelineData.map(item => ({
      time: item.formattedTime,
      value: item.value[0] || 0,
      hasData: item.hasData[0] || false
    }));
  }

  parseRelatedQueries(data) {
    const queries = {
      top: [],
      rising: []
    };

    if (data.default && data.default.rankedList) {
      data.default.rankedList.forEach(list => {
        if (list.rankedKeyword) {
          const type = list.rankedKeyword[0].topic ? 'top' : 'rising';
          queries[type] = list.rankedKeyword.map(item => ({
            query: item.query,
            value: item.value,
            link: item.link || null
          }));
        }
      });
    }

    return queries;
  }

  parseRegionalInterest(data) {
    if (!data.default || !data.default.geoMapData) {
      return [];
    }

    return data.default.geoMapData.map(item => ({
      geoCode: item.geoCode,
      geoName: item.geoName,
      value: item.value[0] || 0,
      maxValueIndex: item.maxValueIndex || 0,
      hasData: item.hasData[0] || false
    }));
  }

  getStartTime(timeframe) {
    const now = new Date();
    
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '4h':
        return new Date(now.getTime() - 4 * 60 * 60 * 1000);
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }