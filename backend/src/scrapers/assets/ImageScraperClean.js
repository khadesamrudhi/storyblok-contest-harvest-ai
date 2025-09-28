// src/scrapers/assets/ImageScraperClean.js

const BaseScraper = require('../base/BaseScraper');
const sharp = require('sharp');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');
const ScraperUtils = require('../base/ScraperUtils');

class ImageScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
  }

  async scrapeImages(url, options = {}) {
    try {
      logger.info(`Starting image scraping for: ${url}`);
      const $ = await this.scrapeWithPuppeteer(url);
      const images = this.extractImages($, url);
      const filteredImages = this.filterImages(images, options);
      if (options.downloadImages) {
        return await this.downloadImages(filteredImages, options);
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
        const matches = style.match(/background-image:\s*url\(['"]?([^'"\)]+)['"]?\)/);
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
        urls.forEach(u => {
          const fullUrl = ScraperUtils.normalizeUrl(u, baseUrl);
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

  getImageContext($el) {
    const context = {
      inHeader: $el.closest('header, .header').length > 0,
      inNav: $el.closest('nav, .nav, .navigation').length > 0,
      inFooter: $el.closest('footer, .footer').length > 0,
      inArticle: $el.closest('article, .article, .post, .content').length > 0,
      inSidebar: $el.closest('aside, .sidebar').length > 0,
      nearText: false
    };
    const parent = $el.parent();
    const siblings = parent.siblings();
    const textContent = parent.text().trim() + siblings.text().trim();
    context.nearText = textContent.length > 50;
    return context;
  }

  filterImages(images, options = {}) {
    let filtered = images;
    if (options.minWidth || options.minHeight) {
      filtered = filtered.filter(img => {
        const width = parseInt(img.width) || 0;
        const height = parseInt(img.height) || 0;
        return width >= (options.minWidth || 0) && height >= (options.minHeight || 0);
      });
    }
    if (options.excludeNavigation) filtered = filtered.filter(img => !img.context.inNav);
    if (options.excludeHeader) filtered = filtered.filter(img => !img.context.inHeader);
    if (options.excludeFooter) filtered = filtered.filter(img => !img.context.inFooter);
    if (options.contentImagesOnly) filtered = filtered.filter(img => img.context.inArticle || img.context.nearText);
    if (options.allowedTypes) {
      const allowed = options.allowedTypes.map(t => t.toLowerCase());
      filtered = filtered.filter(img => {
        const ext = path.extname(img.url).toLowerCase().substring(1);
        return allowed.includes(ext);
      });
    }
    if (options.excludeSmallImages !== false) {
      filtered = filtered.filter(img => {
        const url = img.url.toLowerCase();
        const isIcon = url.includes('icon') || url.includes('favicon') ||
                       (url.includes('logo') && ((parseInt(img.width)||0) < 100 || (parseInt(img.height)||0) < 100));
        return !isIcon;
      });
    }
    return filtered;
  }

  deduplicateImages(images) {
    const seen = new Set();
    return images.filter(img => {
      const key = img.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async downloadImages(images, options = {}) {
    const downloadDir = options.downloadDir || path.join(process.cwd(), 'downloads', 'images');
    await fs.mkdir(downloadDir, { recursive: true });
    const results = [];
    const maxConcurrent = options.maxConcurrent || 5;
    for (let i = 0; i < images.length; i += maxConcurrent) {
      const batch = images.slice(i, i + maxConcurrent);
      const settled = await Promise.allSettled(batch.map(img => this.downloadImage(img, downloadDir, options)));
      settled.forEach((r, idx) => {
        if (r.status === 'fulfilled') results.push(r.value);
        else logger.warn(`Failed to download image ${batch[idx].url}:`, r.reason);
      });
    }
    return results;
  }

  async downloadImage(image, downloadDir, options = {}) {
    const response = await axios.get(image.url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': ScraperUtils.getRandomUserAgent() }
    });
    const contentType = response.headers['content-type'] || '';
    if (!contentType.startsWith('image/')) throw new Error(`Invalid content type: ${contentType}`);
    const buffer = Buffer.from(response.data);
    const filename = ScraperUtils.generateFileName(image.url, this.getFileExtension(contentType));
    const filePath = path.join(downloadDir, filename);

    // Optionally optimize
    let finalBuffer = buffer;
    if (options.optimize) {
      try { finalBuffer = await this.optimizeImage(buffer, options); } catch (e) { logger.warn('Optimize failed:', e); }
    }
    await fs.writeFile(filePath, finalBuffer);
    return { ...image, localPath: filePath, filename, size: finalBuffer.length, downloadedAt: new Date().toISOString() };
  }

  async optimizeImage(buffer, options = {}) {
    const sharpImage = sharp(buffer);
    if (options.maxWidth || options.maxHeight) {
      sharpImage.resize({ width: options.maxWidth, height: options.maxHeight, fit: 'inside', withoutEnlargement: true });
    }
    if (options.format) {
      switch (String(options.format).toLowerCase()) {
        case 'webp': sharpImage.webp({ quality: options.quality || 80 }); break;
        case 'jpeg':
        case 'jpg': sharpImage.jpeg({ quality: options.quality || 80 }); break;
        case 'png': sharpImage.png({ quality: options.quality || 80 }); break;
      }
    }
    return await sharpImage.toBuffer();
  }

  getFileExtension(contentType) {
    const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/bmp': '.bmp' };
    return map[contentType] || '.jpg';
  }
}

module.exports = { ImageScraper };
