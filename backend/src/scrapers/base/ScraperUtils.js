// src/scrapers/base/ScraperUtils.js

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const axios = require('axios');
const logger = require('../../utils/logger');

class ScraperUtils {
  constructor() {
    this.rateLimitMap = new Map();
    this.robotsCache = new Map();
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
  }

  // File Management
  static generateFileName(url, extension = '.json') {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const timestamp = Date.now();
    const domain = this.extractDomain(url)?.replace(/[^a-z0-9]/gi, '_') || 'unknown';
    return `${domain}_${hash.substring(0, 8)}_${timestamp}${extension}`;
  }

  static async saveScrapedData(data, filename, subDir = '') {
    try {
      const baseDir = path.join(process.cwd(), 'scraped_data');
      const dir = subDir ? path.join(baseDir, subDir) : baseDir;
      
      await fs.mkdir(dir, { recursive: true });
      
      const filePath = path.join(dir, filename);
      const jsonData = JSON.stringify(data, null, 2);
      
      await fs.writeFile(filePath, jsonData, 'utf8');
      
      logger.info(`Scraped data saved: ${filePath} (${jsonData.length} bytes)`);
      return filePath;
    } catch (error) {
      logger.error('Failed to save scraped data:', error);
      throw error;
    }
  }

  static async loadScrapedData(filename, subDir = '') {
    try {
      const baseDir = path.join(process.cwd(), 'scraped_data');
      const filePath = subDir 
        ? path.join(baseDir, subDir, filename)
        : path.join(baseDir, filename);
      
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to load scraped data:', error);
      throw error;
    }
  }

  static async cleanOldFiles(maxAgeInDays = 7, subDir = '') {
    try {
      const baseDir = path.join(process.cwd(), 'scraped_data');
      const dir = subDir ? path.join(baseDir, subDir) : baseDir;
      
      if (!await this.dirExists(dir)) return;
      
      const files = await fs.readdir(dir);
      const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
          logger.info(`Deleted old file: ${file}`);
        }
      }

      logger.info(`Cleanup completed: ${deletedCount} files deleted`);
    } catch (error) {
      logger.error('Failed to clean old files:', error);
    }
  }

  // URL Utilities
  static extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (error) {
      logger.warn(`Invalid URL: ${url}`);
      return null;
    }
  }

  static normalizeUrl(url, baseUrl = null) {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return new URL(url).href;
      }
      
      if (url.startsWith('//')) {
        return `https:${url}`;
      }
      
      if (baseUrl) {
        return new URL(url, baseUrl).href;
      }
      
      return url;
    } catch (error) {
      logger.warn(`Failed to normalize URL: ${url}`);
      return url;
    }
  }

  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  static getUrlPath(url) {
    try {
      return new URL(url).pathname;
    } catch (error) {
      return '/';
    }
  }

  static getQueryParams(url) {
    try {
      return Object.fromEntries(new URL(url).searchParams);
    } catch (error) {
      return {};
    }
  }

  // Content Type Detection
  static getContentType(headers) {
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    return contentType.split(';')[0].toLowerCase().trim();
  }

  static isHtmlContent(contentType) {
    return contentType.includes('text/html');
  }

  static isJsonContent(contentType) {
    return contentType.includes('application/json');
  }

  static isImageUrl(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext));
  }

  static isVideoUrl(url) {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
    const urlLower = url.toLowerCase();
    return videoExtensions.some(ext => urlLower.includes(ext));
  }

  static isDocumentUrl(url) {
    const docExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'];
    const urlLower = url.toLowerCase();
    return docExtensions.some(ext => urlLower.includes(ext));
  }

  // Robots.txt Handling
  async getRobotsRules(domain) {
    try {
      // Check cache first
      if (this.robotsCache.has(domain)) {
        const cached = this.robotsCache.get(domain);
        if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24 hours cache
          return cached.rules;
        }
      }

      const robotsUrl = `https://${domain}/robots.txt`;
      const response = await axios.get(robotsUrl, {
        timeout: 10000,
        headers: { 'User-Agent': this.generateUserAgent() }
      });
      
      if (response.status === 200) {
        const rules = this.parseRobotsText(response.data);
        this.robotsCache.set(domain, {
          rules,
          timestamp: Date.now()
        });
        return rules;
      }
    } catch (error) {
      logger.warn(`Could not fetch robots.txt for ${domain}: ${error.message}`);
    }
    
    return { allowed: true, crawlDelay: 0, disallowedPaths: [], allowedPaths: [] };
  }

  parseRobotsText(robotsText) {
    const rules = {
      allowed: true,
      crawlDelay: 0,
      disallowedPaths: [],
      allowedPaths: [],
      sitemaps: []
    };

    const lines = robotsText.split('\n');
    let currentUserAgent = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;

      const lowerLine = trimmedLine.toLowerCase();
      
      if (lowerLine.startsWith('user-agent:')) {
        const userAgent = trimmedLine.split(':', 2)[1].trim();
        currentUserAgent = userAgent === '*' || userAgent.includes('contentharvest');
        continue;
      }
      
      if (lowerLine.startsWith('sitemap:')) {
        const sitemap = trimmedLine.split(':', 2)[1].trim();
        if (sitemap) rules.sitemaps.push(sitemap);
        continue;
      }

      if (currentUserAgent) {
        if (lowerLine.startsWith('disallow:')) {
          const path = trimmedLine.split(':', 2)[1].trim();
          if (path) rules.disallowedPaths.push(path);
        } else if (lowerLine.startsWith('allow:')) {
          const path = trimmedLine.split(':', 2)[1].trim();
          if (path) rules.allowedPaths.push(path);
        } else if (lowerLine.startsWith('crawl-delay:')) {
          const delay = parseInt(trimmedLine.split(':', 2)[1].trim());
          if (!isNaN(delay)) rules.crawlDelay = delay * 1000; // Convert to ms
        }
      }
    }

    return rules;
  }

  static isUrlAllowed(url, robotsRules) {
    if (!robotsRules || !robotsRules.disallowedPaths) return true;

    try {
      const urlPath = new URL(url).pathname;

      // Check disallowed paths
      for (const disallowedPath of robotsRules.disallowedPaths) {
        if (this.pathMatches(urlPath, disallowedPath)) {
          // Check for more specific allow rules
          for (const allowedPath of robotsRules.allowedPaths) {
            if (this.pathMatches(urlPath, allowedPath)) {
              return true;
            }
          }
          return false;
        }
      }

      return true;
    } catch (error) {
      return true; // If we can't parse the URL, assume allowed
    }
  }

  static pathMatches(urlPath, rulePath) {
    if (rulePath === '/') return true;
    if (rulePath.endsWith('*')) {
      return urlPath.startsWith(rulePath.slice(0, -1));
    }
    return urlPath.startsWith(rulePath);
  }

  // Rate Limiting
  async respectRateLimit(domain, customDelay = null) {
    const minInterval = customDelay || 2000; // Default 2 seconds
    const lastRequestTime = this.rateLimitMap.get(domain) || 0;
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      logger.debug(`Rate limiting: waiting ${waitTime}ms for ${domain}`);
      await this.delay(waitTime);
    }
    
    this.rateLimitMap.set(domain, Date.now());
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // User Agent Management
  generateUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  static setCustomUserAgent(userAgent) {
    if (typeof userAgent === 'string') {
      this.customUserAgent = userAgent;
    }
  }

  static getRandomUserAgent() {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  // Content Processing
  static sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace invalid characters
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores
      .substring(0, 200); // Limit length
  }

  static calculateContentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  static async isDuplicateContent(content, existingHashes = []) {
    const hash = this.calculateContentHash(content);
    return existingHashes.includes(hash);
  }

  // Structured Data Extraction
  static extractStructuredData($) {
    const structuredData = [];

    // JSON-LD
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const jsonData = JSON.parse($(el).html().trim());
        structuredData.push({
          type: 'json-ld',
          data: jsonData
        });
      } catch (error) {
        // Ignore malformed JSON-LD
      }
    });

    // Microdata
    $('[itemscope]').each((i, el) => {
      const $item = $(el);
      const itemType = $item.attr('itemtype');
      const properties = {};

      $item.find('[itemprop]').each((j, propEl) => {
        const $prop = $(propEl);
        const propName = $prop.attr('itemprop');
        let propValue = $prop.attr('content') || $prop.attr('href') || $prop.text().trim();
        
        if (propValue) {
          properties[propName] = propValue;
        }
      });

      if (Object.keys(properties).length > 0) {
        structuredData.push({
          type: 'microdata',
          itemType,
          properties
        });
      }
    });

    // Open Graph
    const ogData = {};
    $('meta[property^="og:"]').each((i, el) => {
      const property = $(el).attr('property');
      const content = $(el).attr('content');
      if (property && content) {
        ogData[property] = content;
      }
    });

    if (Object.keys(ogData).length > 0) {
      structuredData.push({
        type: 'open-graph',
        data: ogData
      });
    }

    return structuredData;
  }

  // Utility Helpers
  static async dirExists(dir) {
    try {
      const stats = await fs.stat(dir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3).trim() + '...';
  }

  static cleanWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  static removeDuplicates(array, key = null) {
    if (!Array.isArray(array)) return [];
    
    if (key) {
      const seen = new Set();
      return array.filter(item => {
        const val = item[key];
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
      });
    }
    
    return [...new Set(array)];
  }

  // Error Handling
  static createError(message, code, url = null) {
    const error = new Error(message);
    error.code = code;
    if (url) error.url = url;
    return error;
  }

  static isNetworkError(error) {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ETIMEDOUT' || 
           error.code === 'ENOTFOUND' ||
           error.message.includes('network');
  }

  // Performance Monitoring
  static startTimer(label) {
    const start = process.hrtime.bigint();
    return {
      label,
      end: () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        logger.debug(`Timer [${label}]: ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  }
}

// Static properties
ScraperUtils.rateLimitMap = new Map();
ScraperUtils.robotsCache = new Map();
ScraperUtils.customUserAgent = null;

module.exports = ScraperUtils;