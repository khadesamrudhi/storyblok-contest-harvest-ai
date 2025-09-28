// src/scrapers/base/ScraperQueue.js

const Bull = require('bull');
const redis = require('redis');
const logger = require('../../utils/logger');
const { SCRAPING_STATUS } = require('../../utils/constants');

class ScraperQueue {
  constructor() {
    this.redisClient = null;
    this.scrapingQueue = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Initialize Redis connection
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server refused the connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      await this.redisClient.connect();

      // Initialize Bull queue
      this.scrapingQueue = new Bull('scraping queue', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD
        },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      this.setupQueueEvents();
      this.isInitialized = true;
      logger.info('Scraper queue initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize scraper queue:', error);
      throw error;
    }
  }

  setupQueueEvents() {
    this.scrapingQueue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed:`, { 
        jobType: job.data.type,
        url: job.data.url,
        duration: Date.now() - job.timestamp
      });
    });

    this.scrapingQueue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, {
        jobType: job.data.type,
        url: job.data.url,
        error: err.message,
        attempts: job.attemptsMade
      });
    });

    this.scrapingQueue.on('progress', (job, progress) => {
      logger.info(`Job ${job.id} progress: ${progress}%`);
    });

    this.scrapingQueue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled:`, {
        jobType: job.data.type,
        url: job.data.url
      });
    });
  }

  async addScrapingJob(jobData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Queue not initialized');
    }

    const defaultOptions = {
      priority: 5,
      delay: 0,
      attempts: 3,
      ...options
    };

    try {
      const job = await this.scrapingQueue.add('scrape', jobData, defaultOptions);
      logger.info(`Added scraping job ${job.id}:`, {
        type: jobData.type,
        url: jobData.url,
        priority: defaultOptions.priority
      });
      
      return job;
    } catch (error) {
      logger.error('Failed to add scraping job:', error);
      throw error;
    }
  }

  async getJobStatus(jobId) {
    try {
      const job = await this.scrapingQueue.getJob(jobId);
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      const progress = job.progress();

      return {
        id: job.id,
        status: state,
        progress,
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : null
      };
    } catch (error) {
      logger.error('Failed to get job status:', error);
      throw error;
    }
  }
  async removeJob(jobId) {
    try {
      const job = await this.scrapingQueue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`Removed job ${jobId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to remove job:', error);
      throw error;
    }
  }

  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.scrapingQueue.getWaiting(),
        this.scrapingQueue.getActive(),
        this.scrapingQueue.getCompleted(),
        this.scrapingQueue.getFailed(),
        this.scrapingQueue.getDelayed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  async pauseQueue() {
    await this.scrapingQueue.pause();
    logger.info('Scraping queue paused');
  }

  async resumeQueue() {
    await this.scrapingQueue.resume();
    logger.info('Scraping queue resumed');
  }

  async cleanQueue(grace = 0) {
    await this.scrapingQueue.clean(grace, 'completed');
    await this.scrapingQueue.clean(grace, 'failed');
    logger.info('Queue cleaned');
  }

  async close() {
    if (this.scrapingQueue) {
      await this.scrapingQueue.close();
    }
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    logger.info('Scraper queue closed');
  }
}

class ScraperUtils {
  // Generate unique filename for scraped content
  static generateFileName(url, extension = '.json') {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const timestamp = Date.now();
    return `${hash}_${timestamp}${extension}`;
  }

  // Save scraped data to file
  static async saveScrapedData(data, filename) {
    try {
      const dir = path.join(process.cwd(), 'scraped_data');
      await fs.mkdir(dir, { recursive: true });
      
      const filePath = path.join(dir, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      
      logger.info(`Scraped data saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Failed to save scraped data:', error);
      throw error;
    }
  }

  // Load scraped data from file
  static async loadScrapedData(filename) {
    try {
      const filePath = path.join(process.cwd(), 'scraped_data', filename);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to load scraped data:', error);
      throw error;
    }
  }

  // Clean old scraped data files
  static async cleanOldFiles(maxAgeInDays = 7) {
    try {
      const dir = path.join(process.cwd(), 'scraped_data');
      const files = await fs.readdir(dir);
      const maxAge = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < maxAge) {
          await fs.unlink(filePath);
          logger.info(`Deleted old file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Failed to clean old files:', error);
    }
  }

  // Extract domain from URL
  static extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return null;
    }
  }

  // Normalize URL
  static normalizeUrl(url, baseUrl = null) {
    try {
      if (url.startsWith('http')) {
        return url;
      }
      
      if (baseUrl) {
        return new URL(url, baseUrl).href;
      }
      
      return url;
    } catch (error) {
      return url;
    }
  }

  // Extract robots.txt rules
  static async getRobotsRules(domain) {
    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      const response = await fetch(robotsUrl);
      
      if (response.ok) {
        const robotsText = await response.text();
        return this.parseRobotsText(robotsText);
      }
    } catch (error) {
      logger.warn(`Could not fetch robots.txt for ${domain}`);
    }
    
    return { allowed: true, crawlDelay: 0 };
  }

  static parseRobotsText(robotsText) {
    const rules = {
      allowed: true,
      crawlDelay: 0,
      disallowedPaths: [],
      allowedPaths: []
    };

    const lines = robotsText.split('\n');
    let currentUserAgent = false;

    for (const line of lines) {
      const trimmedLine = line.trim().toLowerCase();
      
      if (trimmedLine.startsWith('user-agent:')) {
        const userAgent = trimmedLine.split(':')[1].trim();
        currentUserAgent = userAgent === '*' || userAgent === 'contentharvest-ai';
      }
      
      if (currentUserAgent) {
        if (trimmedLine.startsWith('disallow:')) {
          const path = trimmedLine.split(':')[1].trim();
          if (path) rules.disallowedPaths.push(path);
        }
        
        if (trimmedLine.startsWith('allow:')) {
          const path = trimmedLine.split(':')[1].trim();
          if (path) rules.allowedPaths.push(path);
        }
        
        if (trimmedLine.startsWith('crawl-delay:')) {
          const delay = parseInt(trimmedLine.split(':')[1].trim());
          if (!isNaN(delay)) rules.crawlDelay = delay * 1000; // Convert to ms
        }
      }
    }

    return rules;
  }

  // Check if URL is allowed by robots.txt
  static isUrlAllowed(url, robotsRules) {
    if (!robotsRules || robotsRules.allowed === undefined) {
      return true;
    }

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // Check disallowed paths
      for (const disallowedPath of robotsRules.disallowedPaths) {
        if (path.startsWith(disallowedPath)) {
          // Check if there's a more specific allow rule
          for (const allowedPath of robotsRules.allowedPaths) {
            if (path.startsWith(allowedPath)) {
              return true;
            }
          }
          return false;
        }
      }

      return true;
    } catch (error) {
      return true; // If we can't parse the URL, assume it's allowed
    }
  }

  // Generate user agent string
  static generateUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  // Rate limiting helper
  static async respectRateLimit(domain, crawlDelay = 2000) {
    if (!this.rateLimitMap) {
      this.rateLimitMap = new Map();
    }

    const lastRequestTime = this.rateLimitMap.get(domain) || 0;
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    
    if (timeSinceLastRequest < crawlDelay) {
      const waitTime = crawlDelay - timeSinceLastRequest;
      logger.info(`Rate limiting: waiting ${waitTime}ms for ${domain}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimitMap.set(domain, Date.now());
  }

  // Extract content type from response
  static getContentType(headers) {
    const contentType = headers['content-type'] || '';
    return contentType.split(';')[0].toLowerCase();
  }

  // Check if content is HTML
  static isHtmlContent(contentType) {
    return contentType.includes('text/html');
  }

  // Check if content is JSON
  static isJsonContent(contentType) {
    return contentType.includes('application/json');
  }

  // Check if URL is likely to be an image
  static isImageUrl(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext));
  }

  // Check if URL is likely to be a document
  static isDocumentUrl(url) {
    const docExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const urlLower = url.toLowerCase();
    return docExtensions.some(ext => urlLower.includes(ext));
  }

  // Sanitize filename for storage
  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9.-]/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Calculate content hash for deduplication
  static calculateContentHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // Check if content is duplicate
  static async isDuplicateContent(content, existingHashes = []) {
    const hash = this.calculateContentHash(content);
    return existingHashes.includes(hash);
  }

  // Extract structured data (JSON-LD, microdata)
  static extractStructuredData($) {
    const structuredData = [];

    // Extract JSON-LD
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const jsonData = JSON.parse($(el).html());
        structuredData.push({
          type: 'json-ld',
          data: jsonData
        });
      } catch (error) {
        // Ignore malformed JSON-LD
      }
    });

    // Extract microdata (basic implementation)
    $('[itemscope]').each((i, el) => {
      const item = $(el);
      const itemType = item.attr('itemtype');
      const properties = {};

      item.find('[itemprop]').each((j, propEl) => {
        const prop = $(propEl);
        const propName = prop.attr('itemprop');
        const propValue = prop.attr('content') || prop.text().trim();
        properties[propName] = propValue;
      });

      if (Object.keys(properties).length > 0) {
        structuredData.push({
          type: 'microdata',
          itemType,
          properties
        });
      }
    });

    return structuredData;
  }
}

// Initialize rate limit map
ScraperUtils.rateLimitMap = new Map();

module.exports = { ScraperQueue, ScraperUtils };