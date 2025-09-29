// src/scrapers/base/BaseScraper.js

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const logger = require('../../utils/logger');

class BaseScraper {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      headless: true,
      waitUntil: 'networkidle2',
      ...options
    };

    this.browser = null;
    this.page = null;
  }

  async initBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        protocolTimeout: this.options.timeout + 10000,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          // Avoid single-process on Windows; can cause net::ERR_SOCKET_NOT_CONNECTED
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setUserAgent(this.options.userAgent);
      await this.page.setViewport({ width: 1366, height: 768 });

      // Block unnecessary resources to speed up scraping
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['stylesheet', 'font', 'image'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  async scrapeWithPuppeteer(url, options = {}) {
    if (!this.browser) {
      await this.initBrowser();
    }

    try {
      const response = await this.page.goto(url, {
        waitUntil: this.options.waitUntil,
        timeout: this.options.timeout
      });

      if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response ? response.status() : 'No response'}`);
      }

      // Wait for custom selector if provided
      if (options.waitForSelector) {
        await this.page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }

      // Execute custom script if provided
      if (options.script) {
        await this.page.evaluate(options.script);
      }

      const html = await this.page.content();
      return cheerio.load(html);

    } catch (error) {
      logger.error(`Puppeteer scraping failed for ${url}:`, error);
      throw error;
    }
  }

  async scrapeWithAxios(url, options = {}) {
    try {
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: {
          'User-Agent': this.options.userAgent,
          ...options.headers
        },
        ...options.axiosOptions
      });

      return cheerio.load(response.data);
    } catch (error) {
      logger.error(`Axios scraping failed for ${url}:`, error);
      throw error;
    }
  }

  extractText($, selector) {
    return $(selector).text().trim();
  }

  extractAttribute($, selector, attribute) {
    return $(selector).attr(attribute);
  }

  extractArray($, selector, extractor = 'text') {
    const results = [];
    $(selector).each((i, el) => {
      if (extractor === 'text') {
        results.push($(el).text().trim());
      } else if (typeof extractor === 'string') {
        results.push($(el).attr(extractor));
      } else if (typeof extractor === 'function') {
        results.push(extractor($(el)));
      }
    });
    return results.filter(Boolean);
  }

  extractLinks($, baseUrl = '') {
    const links = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
        links.push({
          url: fullUrl,
          text: $(el).text().trim(),
          title: $(el).attr('title') || ''
        });
      }
    });
    return links;
  }

  extractImages($, baseUrl = '') {
    const images = [];
    $('img[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
        images.push({
          url: fullUrl,
          alt: $(el).attr('alt') || '',
          title: $(el).attr('title') || '',
          width: $(el).attr('width'),
          height: $(el).attr('height')
        });
      }
    });
    return images;
  }

  extractMetadata($) {
    const metadata = {};

    // Title
    metadata.title = $('title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') || '';

    // Description
    metadata.description = $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') || '';

    // Keywords
    metadata.keywords = $('meta[name="keywords"]').attr('content') || '';

    // Open Graph data
    metadata.ogImage = $('meta[property="og:image"]').attr('content') || '';
    metadata.ogUrl = $('meta[property="og:url"]').attr('content') || '';
    metadata.ogType = $('meta[property="og:type"]').attr('content') || '';

    // Author
    metadata.author = $('meta[name="author"]').attr('content') || '';

    // Canonical URL
    metadata.canonical = $('link[rel="canonical"]').attr('href') || '';

    return metadata;
  }

  async closeBrowser() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      logger.info('Browser closed successfully');
    } catch (error) {
      logger.error('Error closing browser:', error);
    }
  }

  // Utility methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  sanitizeText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  isValidUrl(string) {
    new URL(string);
    return true;
  } catch(_) {
    return false;
  }
}
module.exports = BaseScraper;