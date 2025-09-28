// src/scrapers/competitors/ContentScraper.js

const BaseScraper = require('../base/BaseScraper');
const ScraperUtils = require('../base/ScraperUtils');
const logger = require('../../utils/logger');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

class ContentScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    this.scraperUtils = new ScraperUtils();
  }

  async scrapeContent(url, contentType = 'blog') {
    try {
      logger.info(`Starting content scrape for: ${url} (type: ${contentType})`);
      
      const domain = ScraperUtils.extractDomain(url);
      if (!domain) {
        throw new Error('Invalid URL provided');
      }

      // Check robots.txt compliance
      const robotsRules = await this.scraperUtils.getRobotsRules(domain);
      if (!ScraperUtils.isUrlAllowed(url, robotsRules)) {
        throw new Error('URL disallowed by robots.txt');
      }

      // Respect rate limiting
      await this.scraperUtils.respectRateLimit(domain, robotsRules.crawlDelay || 2000);

      const $ = await this.scrapeWithPuppeteer(url, {
        waitForSelector: 'body',
        script: () => {
          // Remove unwanted elements before processing
          const unwanted = document.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ad, .social-share');
          unwanted.forEach(el => el.remove());
        }
      });

      const result = {
        url,
        type: contentType,
        title: this.extractTitle($),
        content: this.extractMainContent($),
        cleanContent: this.extractReadableContent($, url),
        author: this.extractAuthor($),
        publishDate: this.extractPublishDate($),
        modifiedDate: this.extractModifiedDate($),
        tags: this.extractTags($),
        categories: this.extractCategories($),
        readingTime: 0,
        wordCount: 0,
        characterCount: 0,
        images: this.extractContentImages($, url),
        links: this.extractContentLinks($, url),
        headings: this.extractHeadings($),
        metadata: this.extractContentMetadata($),
        structuredData: ScraperUtils.extractStructuredData($),
        socialMetrics: this.extractSocialMetrics($),
        breadcrumbs: this.extractBreadcrumbs($),
        contentStructure: this.analyzeContentStructure($),
        scrapedAt: new Date().toISOString()
      };

      // Calculate content metrics
      if (result.cleanContent) {
        result.wordCount = this.calculateWordCount(result.cleanContent);
        result.characterCount = result.cleanContent.length;
        result.readingTime = this.calculateReadingTime(result.cleanContent);
      }

      logger.info(`Content scrape completed for: ${url} (${result.wordCount} words)`);
      return result;

    } catch (error) {
      logger.error(`Content scraping failed for ${url}:`, error);
      throw error;
    }
  }

  extractTitle($) {
    // Try multiple selectors for title
    const titleSelectors = [
      'h1.entry-title',
      'h1.post-title',
      'h1.article-title',
      '.entry-header h1',
      '.post-header h1',
      'article h1',
      'h1',
      'title'
    ];

    for (const selector of titleSelectors) {
      const title = $(selector).first().text().trim();
      if (title && title.length > 0) {
        return ScraperUtils.cleanWhitespace(title);
      }
    }

    // Fallback to meta title
    const metaTitle = $('meta[property="og:title"]').attr('content') ||
                     $('meta[name="twitter:title"]').attr('content');
    return metaTitle ? ScraperUtils.cleanWhitespace(metaTitle) : '';
  }

  extractMainContent($) {
    const contentSelectors = [
      'article .entry-content',
      'article .post-content',
      'article .content',
      '.entry-content',
      '.post-content',
      '.article-content',
      '.content-body',
      'main article',
      'main .content',
      '[role="main"] article',
      'article',
      '.post',
      '.entry'
    ];

    let bestContent = '';
    let maxLength = 0;

    for (const selector of contentSelectors) {
      const content = $(selector).text().trim();
      if (content.length > maxLength) {
        bestContent = content;
        maxLength = content.length;
      }
    }

    // If no specific content area found, try to extract from body
    if (!bestContent) {
      bestContent = $('body').text().trim();
    }

    return ScraperUtils.cleanWhitespace(bestContent);
  }

  extractReadableContent($, url) {
    try {
      // Use Mozilla's Readability algorithm for better content extraction
      const dom = new JSDOM($.html(), { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (article && article.textContent) {
        return ScraperUtils.cleanWhitespace(article.textContent);
      }
    } catch (error) {
      logger.warn('Readability extraction failed, using fallback:', error);
    }

    return this.extractMainContent($);
  }

  extractAuthor($) {
    const authorSelectors = [
      '.author .name',
      '.by-author',
      '.post-author',
      '.entry-author',
      '[rel="author"]',
      '.author',
      '[itemprop="author"]'
    ];

    for (const selector of authorSelectors) {
      const author = $(selector).text().trim();
      if (author) {
        return ScraperUtils.cleanWhitespace(author);
      }
    }

    // Check meta tags
    const metaAuthor = $('meta[name="author"]').attr('content');
    if (metaAuthor) {
      return ScraperUtils.cleanWhitespace(metaAuthor);
    }

    // Check structured data
    try {
      const structuredData = ScraperUtils.extractStructuredData($);
      for (const data of structuredData) {
        if (data.type === 'json-ld' && data.data.author) {
          const author = typeof data.data.author === 'string' 
            ? data.data.author 
            : data.data.author.name;
          if (author) return ScraperUtils.cleanWhitespace(author);
        }
      }
    } catch (error) {
      // Ignore structured data errors
    }

    return '';
  }

  extractPublishDate($) {
    const dateSelectors = [
      'time[datetime][pubdate]',
      'time[datetime]',
      '.published',
      '.post-date',
      '.entry-date',
      '.publish-date',
      '[itemprop="datePublished"]'
    ];

    for (const selector of dateSelectors) {
      const dateElement = $(selector).first();
      const dateValue = dateElement.attr('datetime') || 
                       dateElement.attr('content') || 
                       dateElement.text().trim();
      
      if (dateValue) {
        const parsedDate = this.parseDate(dateValue);
        if (parsedDate) return parsedDate;
      }
    }

    // Check meta tags
    const metaDate = $('meta[property="article:published_time"]').attr('content') ||
                    $('meta[name="pubdate"]').attr('content') ||
                    $('meta[name="date"]').attr('content');
    
    if (metaDate) {
      const parsedDate = this.parseDate(metaDate);
      if (parsedDate) return parsedDate;
    }

    return null;
  }

  extractModifiedDate($) {
    const modifiedSelectors = [
      'time[datetime][class*="modified"]',
      '.modified',
      '.updated',
      '[itemprop="dateModified"]'
    ];

    for (const selector of modifiedSelectors) {
      const dateElement = $(selector).first();
      const dateValue = dateElement.attr('datetime') || 
                       dateElement.attr('content') || 
                       dateElement.text().trim();
      
      if (dateValue) {
        const parsedDate = this.parseDate(dateValue);
        if (parsedDate) return parsedDate;
      }
    }

    const metaModified = $('meta[property="article:modified_time"]').attr('content');
    if (metaModified) {
      const parsedDate = this.parseDate(metaModified);
      if (parsedDate) return parsedDate;
    }

    return null;
  }

  extractTags($) {
    const tags = new Set();
    
    const tagSelectors = [
      '.tags a',
      '.tag a',
      '.post-tags a',
      '.entry-tags a',
      '[rel="tag"]',
      '.hashtag',
      '[itemprop="keywords"]'
    ];

    for (const selector of tagSelectors) {
      $(selector).each((i, el) => {
        const tag = $(el).text().trim();
        if (tag) {
          tags.add(ScraperUtils.cleanWhitespace(tag));
        }
      });
    }

    // Check meta keywords
    const metaKeywords = $('meta[name="keywords"]').attr('content');
    if (metaKeywords) {
      metaKeywords.split(',').forEach(keyword => {
        const cleanKeyword = ScraperUtils.cleanWhitespace(keyword);
        if (cleanKeyword) tags.add(cleanKeyword);
      });
    }

    return Array.from(tags);
  }

  extractCategories($) {
    const categories = new Set();
    
    const categorySelectors = [
      '.categories a',
      '.category a',
      '.post-categories a',
      '.entry-categories a',
      '[rel="category"]'
    ];

    for (const selector of categorySelectors) {
      $(selector).each((i, el) => {
        const category = $(el).text().trim();
        if (category) {
          categories.add(ScraperUtils.cleanWhitespace(category));
        }
      });
    }

    // Check structured data for categories
    try {
      const structuredData = ScraperUtils.extractStructuredData($);
      for (const data of structuredData) {
        if (data.type === 'json-ld' && data.data.articleSection) {
          categories.add(data.data.articleSection);
        }
      }
    } catch (error) {
      // Ignore structured data errors
    }

    return Array.from(categories);
  }

  extractContentImages($, baseUrl) {
    const images = [];
    const contentSelectors = [
      'article img',
      '.entry-content img',
      '.post-content img',
      '.content img',
      'main img'
    ];

    const processedUrls = new Set();

    for (const selector of contentSelectors) {
      $(selector).each((i, el) => {
        const $img = $(el);
        const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy');
        
        if (src) {
          const fullUrl = ScraperUtils.normalizeUrl(src, baseUrl);
          
          if (!processedUrls.has(fullUrl)) {
            processedUrls.add(fullUrl);
            
            images.push({
              url: fullUrl,
              alt: $img.attr('alt') || '',
              title: $img.attr('title') || '',
              width: $img.attr('width'),
              height: $img.attr('height'),
              caption: this.extractImageCaption($img),
              position: i + 1
            });
          }
        }
      });
    }

    return images;
  }

  extractImageCaption($img) {
    // Look for captions in various places
    const figure = $img.closest('figure');
    if (figure.length) {
      const caption = figure.find('figcaption').text().trim();
      if (caption) return ScraperUtils.cleanWhitespace(caption);
    }

    const parent = $img.parent();
    const caption = parent.find('.caption, .wp-caption-text').text().trim();
    if (caption) return ScraperUtils.cleanWhitespace(caption);

    return '';
  }

  extractContentLinks($, baseUrl) {
    const links = [];
    const contentSelectors = [
      'article a[href]',
      '.entry-content a[href]',
      '.post-content a[href]',
      '.content a[href]',
      'main a[href]'
    ];

    const processedUrls = new Set();

    for (const selector of contentSelectors) {
      $(selector).each((i, el) => {
        const $link = $(el);
        const href = $link.attr('href');
        
        if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
          const fullUrl = ScraperUtils.normalizeUrl(href, baseUrl);
          
          if (!processedUrls.has(fullUrl)) {
            processedUrls.add(fullUrl);
            
            const isInternal = ScraperUtils.extractDomain(fullUrl) === ScraperUtils.extractDomain(baseUrl);
            
            links.push({
              url: fullUrl,
              text: ScraperUtils.cleanWhitespace($link.text()),
              title: $link.attr('title') || '',
              isInternal,
              isNoFollow: $link.attr('rel') && $link.attr('rel').includes('nofollow'),
              position: i + 1
            });
          }
        }
      });
    }

    return links;
  }

  extractHeadings($) {
    const headings = [];
    
    for (let level = 1; level <= 6; level++) {
      $(`h${level}`).each((i, el) => {
        const $heading = $(el);
        const text = $heading.text().trim();
        
        if (text) {
          headings.push({
            level,
            text: ScraperUtils.cleanWhitespace(text),
            id: $heading.attr('id') || '',
            position: headings.length + 1
          });
        }
      });
    }

    // Sort by document order
    return headings.sort((a, b) => a.position - b.position);
  }

  extractContentMetadata($) {
    return {
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      keywords: $('meta[name="keywords"]').attr('content') || '',
      canonical: $('link[rel="canonical"]').attr('href') || '',
      robots: $('meta[name="robots"]').attr('content') || '',
      viewport: $('meta[name="viewport"]').attr('content') || '',
      language: $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content') || '',
      charset: $('meta[charset]').attr('charset') || $('meta[http-equiv="content-type"]').attr('content') || ''
    };
  }

  extractSocialMetrics($) {
    const metrics = {
      shares: 0,
      likes: 0,
      comments: 0,
      socialLinks: []
    };

    // Look for social share counts (these vary by site)
    const shareSelectors = [
      '.share-count',
      '.social-count',
      '[data-share-count]'
    ];

    for (const selector of shareSelectors) {
      const count = parseInt($(selector).text().replace(/[^0-9]/g, '')) || 0;
      if (count > 0) {
        metrics.shares += count;
      }
    }

    // Extract social media links
    const socialPlatforms = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube'];
    socialPlatforms.forEach(platform => {
      $(`a[href*="${platform}.com"]`).each((i, el) => {
        const $link = $(el);
        metrics.socialLinks.push({
          platform,
          url: $link.attr('href'),
          text: $link.text().trim()
        });
      });
    });

    return metrics;
  }

  extractBreadcrumbs($) {
    const breadcrumbs = [];
    
    const breadcrumbSelectors = [
      '.breadcrumb a',
      '.breadcrumbs a',
      '[role="navigation"] a',
      '.navigation a'
    ];

    for (const selector of breadcrumbSelectors) {
      $(selector).each((i, el) => {
        const $link = $(el);
        const text = $link.text().trim();
        const href = $link.attr('href');
        
        if (text && href) {
          breadcrumbs.push({
            text: ScraperUtils.cleanWhitespace(text),
            url: href,
            position: i + 1
          });
        }
      });
      
      if (breadcrumbs.length > 0) break; // Use first matching selector
    }

    return breadcrumbs;
  }

  analyzeContentStructure($) {
    const structure = {
      paragraphCount: $('p').length,
      listCount: $('ul, ol').length,
      listItemCount: $('li').length,
      tableCount: $('table').length,
      blockquoteCount: $('blockquote').length,
      codeBlockCount: $('pre, code').length,
      headingDistribution: {}
    };

    // Count headings by level
    for (let level = 1; level <= 6; level++) {
      structure.headingDistribution[`h${level}`] = $(`h${level}`).length;
    }

    return structure;
  }

  parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (error) {
      // Try common date formats
      const formats = [
        /(\d{4})-(\d{2})-(\d{2})/,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        /(\d{1,2})-(\d{1,2})-(\d{4})/
      ];

      for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
          try {
            const date = new Date(match[0]);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          } catch {
            continue;
          }
        }
      }
    }
    
    return null;
  }

  calculateWordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  calculateReadingTime(text, wordsPerMinute = 200) {
    const wordCount = this.calculateWordCount(text);
    return Math.ceil(wordCount / wordsPerMinute);
  }

  // Bulk content scraping
  async scrapeMultipleContent(urls, options = {}) {
    const results = [];
    const maxConcurrent = options.maxConcurrent || 3;
    
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(
        batch.map(url => this.scrapeContent(url, options.contentType))
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error(`Failed to scrape ${batch[index]}:`, result.reason);
          results.push({
            url: batch[index],
            error: result.reason.message,
            scrapedAt: new Date().toISOString()
          });
        }
      });

      // Respect rate limiting between batches
      if (i + maxConcurrent < urls.length) {
        await ScraperUtils.delay(2000);
      }
    }

    return results;
  }
}

module.exports = ContentScraper;