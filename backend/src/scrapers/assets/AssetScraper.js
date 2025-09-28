// src/scrapers/assets/AssetScraper.js

const BaseScraper = require('../base/BaseScraper');
const { ImageScraper } = require('./ImageScraperClean');
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

      // Scrape images first
      if (options.includeImages !== false) {
        assets.images = await this.imageScraper.scrapeImages(url, {
          ...options,
          downloadImages: options.downloadAssets === true
        });
      }

      // Use puppeteer DOM to extract other assets
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

    $('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]').each((i, el) => {
      const $iframe = $(el);
      const src = $iframe.attr('src');
      if (src) {
        videos.push({
          url: src,
          type: 'embedded_video',
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
        const ext = (href.split('.').pop() || '').toLowerCase();
        const dotExt = `.${ext}`;
        if (docExtensions.includes(dotExt)) {
          documents.push({
            url: new URL(href, baseUrl).href,
            type: 'document',
            extension: dotExt,
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
}

module.exports = { AssetScraper };
