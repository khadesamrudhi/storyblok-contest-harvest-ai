// src/scrapers/competitors/WebsiteScraper.js

const BaseModule = require('../base/BaseScraper');
const BaseScraper = BaseModule.BaseScraper || BaseModule;
const logger = require('../../utils/logger');

class WebsiteScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
  }

  async scrapeWebsite(url) {
    try {
      logger.info(`Starting website scrape for: ${url}`);

      const $ = await this.scrapeWithPuppeteer(url);

      const result = {
        url,
        metadata: this.extractMetadata($),
        content: this.extractMainContent($),
        links: this.extractLinks($, url),
        images: this.extractImages($, url),
        headings: this.extractHeadings($),
        socialLinks: this.extractSocialLinks($),
        contactInfo: this.extractContactInfo($),
        technologies: await this.detectTechnologies($),
        scrapedAt: new Date().toISOString()
      };

      logger.info(`Website scrape completed for: ${url}`);
      return result;

    } catch (error) {
      logger.error(`Website scraping failed for ${url}:`, error);
      throw error;
    }
  }

  extractMainContent($) {
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '#main-content',
      '.content',
      '#content',
      'article',
      '.post-content',
      '.entry-content'
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const text = $(selector).text().trim();
      if (text.length > content.length) content = text;
    }

    if (!content) content = $('body').text().trim();
    return this.sanitizeText(content);
  }

  extractHeadings($) {
    const headings = [];
    for (let i = 1; i <= 6; i++) {
      $(`h${i}`).each((index, el) => {
        const text = $(el).text().trim();
        if (text) {
          headings.push({ level: i, text, id: $(el).attr('id') || '' });
        }
      });
    }
    return headings;
  }

  extractSocialLinks($) {
    const socialPlatforms = [
      'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com',
      'youtube.com', 'tiktok.com', 'pinterest.com', 'github.com'
    ];
    const socialLinks = {};
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        for (const platform of socialPlatforms) {
          if (href.includes(platform)) {
            const platformName = platform.split('.')[0];
            socialLinks[platformName] = href;
          }
        }
      }
    });
    return socialLinks;
  }

  extractContactInfo($) {
    const contactInfo = {};

    // Email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const bodyText = $('body').text();
    const emails = bodyText.match(emailRegex) || [];
    if (emails.length > 0) contactInfo.emails = [...new Set(emails)];

    // Phone numbers (simple pattern)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
    const phones = bodyText.match(phoneRegex) || [];
    if (phones.length > 0) contactInfo.phones = [...new Set(phones)];

    // Address selectors
    const addressSelectors = [
      '[itemprop="address"]',
      '.address',
      '#address',
      '.contact-address'
    ];
    for (const selector of addressSelectors) {
      const address = $(selector).text().trim();
      if (address) { contactInfo.address = address; break; }
    }

    return contactInfo;
  }

  async detectTechnologies($) {
    const technologies = [];
    const techIndicators = {
      'React': () => $('script').text().includes('React') || $('[data-reactroot]').length > 0,
      'Vue.js': () => $('script').text().includes('Vue') || $('[data-v-]').length > 0,
      'Angular': () => $('script').text().includes('ng-') || $('[ng-]').length > 0,
      'jQuery': () => $('script').text().includes('jquery') || typeof $ !== 'undefined',
      'Bootstrap': () => $('link[href*="bootstrap"]').length > 0 || $('.container, .row, .col-').length > 0,
      'WordPress': () => $('meta[name="generator"][content*="WordPress"]').length > 0,
      'Shopify': () => $('script').text().includes('Shopify') || $('.shopify').length > 0,
      'Google Analytics': () => $('script').text().includes('gtag') || $('script').text().includes('ga(')
    };
    for (const [tech, detector] of Object.entries(techIndicators)) {
      try { if (detector()) technologies.push(tech); } catch { /* ignore */ }
    }
    return technologies;
  }
}

module.exports = { WebsiteScraper };

