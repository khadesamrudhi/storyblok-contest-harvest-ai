// src/scrapers/assets/VideoScraper.js

const BaseScraper = require('../base/BaseScraper');
const MediaValidator = require('./MediaValidator');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');
const { ScraperUtils } = require('../base/ScraperUtils');

class VideoScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    this.mediaValidator = new MediaValidator();
    this.downloadedVideos = new Map();
  }

  async scrapeVideos(url, options = {}) {
    try {
      logger.info(`Starting video scraping for: ${url}`);
      
      const $ = await this.scrapeWithPuppeteer(url);
      
      const videos = this.extractVideos($, url);
      const embeddedVideos = this.extractEmbeddedVideos($, url);
      const backgroundVideos = this.extractBackgroundVideos($, url);
      
      const allVideos = [...videos, ...embeddedVideos, ...backgroundVideos];
      const filteredVideos = this.filterVideos(allVideos, options);
      
      if (options.downloadVideos) {
        const downloadedVideos = await this.downloadVideos(filteredVideos, options);
        return downloadedVideos;
      }
      
      return filteredVideos;

    } catch (error) {
      logger.error(`Video scraping failed for ${url}:`, error);
      throw error;
    }
  }

  extractVideos($, baseUrl) {
    const videos = [];
    
    // HTML5 video tags
    $('video').each((i, el) => {
      const $video = $(el);
      const src = $video.attr('src');
      const poster = $video.attr('poster');
      
      if (src) {
        videos.push({
          url: ScraperUtils.normalizeUrl(src, baseUrl),
          poster: poster ? ScraperUtils.normalizeUrl(poster, baseUrl) : null,
          type: 'html5_video',
          width: $video.attr('width'),
          height: $video.attr('height'),
          controls: $video.attr('controls') !== undefined,
          autoplay: $video.attr('autoplay') !== undefined,
          muted: $video.attr('muted') !== undefined,
          loop: $video.attr('loop') !== undefined,
          preload: $video.attr('preload') || 'metadata',
          context: this.getVideoContext($video)
        });
      }

      // Video sources
      $video.find('source').each((j, source) => {
        const $source = $(source);
        const sourceSrc = $source.attr('src');
        
        if (sourceSrc) {
          videos.push({
            url: ScraperUtils.normalizeUrl(sourceSrc, baseUrl),
            poster: poster ? ScraperUtils.normalizeUrl(poster, baseUrl) : null,
            type: 'html5_video_source',
            mimeType: $source.attr('type'),
            media: $source.attr('media'),
            context: this.getVideoContext($video)
          });
        }
      });
    });

    return videos;
  }

  extractEmbeddedVideos($, baseUrl) {
    const videos = [];
    
    // YouTube videos
    $('iframe[src*="youtube.com"], iframe[src*="youtu.be"]').each((i, el) => {
      const $iframe = $(el);
      const src = $iframe.attr('src');
      
      if (src) {
        const videoId = this.extractYouTubeId(src);
        videos.push({
          url: src,
          videoId,
          type: 'youtube',
          platform: 'youtube',
          thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null,
          width: $iframe.attr('width'),
          height: $iframe.attr('height'),
          title: $iframe.attr('title') || '',
          context: this.getVideoContext($iframe)
        });
      }
    });

    // Vimeo videos
    $('iframe[src*="vimeo.com"]').each((i, el) => {
      const $iframe = $(el);
      const src = $iframe.attr('src');
      
      if (src) {
        const videoId = this.extractVimeoId(src);
        videos.push({
          url: src,
          videoId,
          type: 'vimeo',
          platform: 'vimeo',
          width: $iframe.attr('width'),
          height: $iframe.attr('height'),
          title: $iframe.attr('title') || '',
          context: this.getVideoContext($iframe)
        });
      }
    });

    // Other embedded videos
    const otherPlatforms = ['dailymotion', 'twitch', 'wistia', 'brightcove'];
    otherPlatforms.forEach(platform => {
      $(`iframe[src*="${platform}"]`).each((i, el) => {
        const $iframe = $(el);
        const src = $iframe.attr('src');
        
        if (src) {
          videos.push({
            url: src,
            type: 'embedded',
            platform,
            width: $iframe.attr('width'),
            height: $iframe.attr('height'),
            title: $iframe.attr('title') || '',
            context: this.getVideoContext($iframe)
          });
        }
      });
    });

    return videos;
  }

  extractBackgroundVideos($, baseUrl) {
    const videos = [];
    
    // CSS background videos are less common, but check inline styles
    $('*[style*="background"]').each((i, el) => {
      const $el = $(el);
      const style = $el.attr('style');
      
      if (style) {
        const videoMatch = style.match(/url\(['"]?([^'"]+\.(?:mp4|webm|ogg))['"]?\)/i);
        if (videoMatch) {
          videos.push({
            url: ScraperUtils.normalizeUrl(videoMatch[1], baseUrl),
            type: 'background_video',
            element: $el.prop('tagName').toLowerCase(),
            className: $el.attr('class') || '',
            context: this.getVideoContext($el)
          });
        }
      }
    });

    return videos;
  }

  getVideoContext($video) {
    return {
      inHeader: $video.closest('header, .header').length > 0,
      inNav: $video.closest('nav, .nav').length > 0,
      inFooter: $video.closest('footer, .footer').length > 0,
      inArticle: $video.closest('article, .article, .post').length > 0,
      inHero: $video.closest('.hero, .banner, .jumbotron').length > 0,
      isModal: $video.closest('.modal, .popup, .overlay').length > 0,
      hasPlayButton: $video.siblings('.play-button, .play-btn').length > 0
    };
  }

  filterVideos(videos, options = {}) {
    let filtered = videos;

    // Remove duplicates
    const seen = new Set();
    filtered = filtered.filter(video => {
      const key = video.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter by type
    if (options.videoTypes && options.videoTypes.length > 0) {
      filtered = filtered.filter(video => 
        options.videoTypes.includes(video.type)
      );
    }

    // Filter by platform
    if (options.platforms && options.platforms.length > 0) {
      filtered = filtered.filter(video => 
        !video.platform || options.platforms.includes(video.platform)
      );
    }

    // Exclude navigation videos
    if (options.excludeNavigation) {
      filtered = filtered.filter(video => 
        !video.context?.inNav && !video.context?.inHeader
      );
    }

    // Only content videos
    if (options.contentVideosOnly) {
      filtered = filtered.filter(video => 
        video.context?.inArticle || video.context?.inHero
      );
    }

    // Filter by minimum dimensions
    if (options.minWidth || options.minHeight) {
      filtered = filtered.filter(video => {
        const width = parseInt(video.width) || 0;
        const height = parseInt(video.height) || 0;
        return width >= (options.minWidth || 0) && 
               height >= (options.minHeight || 0);
      });
    }

    return filtered;
  }

  async downloadVideos(videos, options = {}) {
    const downloadDir = options.downloadDir || 
                       path.join(process.cwd(), 'downloads', 'videos');
    await fs.mkdir(downloadDir, { recursive: true });

    const downloadedVideos = [];
    const maxConcurrent = options.maxConcurrent || 2; // Videos are large
    
    // Only download actual video files (not embedded)
    const downloadableVideos = videos.filter(video => 
      video.type === 'html5_video' || 
      video.type === 'html5_video_source' ||
      video.type === 'background_video'
    );

    // Process videos in small batches
    for (let i = 0; i < downloadableVideos.length; i += maxConcurrent) {
      const batch = downloadableVideos.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(
        batch.map(video => this.downloadVideo(video, downloadDir, options))
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          downloadedVideos.push(result.value);
        } else {
          logger.warn(`Failed to download video ${batch[index].url}:`, 
                     result.reason?.message);
        }
      });
    }

    return [...downloadedVideos, ...videos.filter(v => 
      v.type === 'youtube' || v.type === 'vimeo' || v.type === 'embedded'
    )];
  }

  async downloadVideo(video, downloadDir, options = {}) {
    try {
      // Skip if already downloaded
      if (this.downloadedVideos.has(video.url)) {
        return this.downloadedVideos.get(video.url);
      }

      logger.info(`Downloading video: ${video.url}`);

      const response = await axios.get(video.url, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2 minutes for videos
        headers: {
          'User-Agent': ScraperUtils.generateUserAgent(),
          'Accept': 'video/mp4,video/webm,video/*,*/*'
        },
        maxContentLength: options.maxFileSize || 100 * 1024 * 1024 // 100MB
      });

      const buffer = Buffer.from(response.data);
      
      // Validate video
      const validation = await this.mediaValidator.validateMedia(buffer, video.url);
      if (!validation.valid) {
        throw new Error(`Invalid video: ${validation.error}`);
      }

      const filename = this.generateVideoFilename(video.url, validation.metadata);
      const filePath = path.join(downloadDir, filename);

      await fs.writeFile(filePath, buffer);

      const downloadedVideo = {
        ...video,
        localPath: filePath,
        filename,
        size: buffer.length,
        metadata: validation.metadata,
        downloadedAt: new Date().toISOString()
      };

      this.downloadedVideos.set(video.url, downloadedVideo);
      logger.info(`Video downloaded successfully: ${filename}`);

      return downloadedVideo;

    } catch (error) {
      logger.error(`Failed to download video ${video.url}:`, error);
      throw error;
    }
  }

  generateVideoFilename(url, metadata) {
    const hash = require('crypto').createHash('md5').update(url).digest('hex');
    const timestamp = Date.now();
    const extension = metadata?.format || 'mp4';
    
    return `video_${hash}_${timestamp}.${extension}`;
  }

  extractYouTubeId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? match[1] : null;
  }

  extractVimeoId(url) {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    return match ? match[1] : null;
  }

  // Get video metadata without downloading (for embedded videos)
  async getVideoInfo(video) {
    try {
      if (video.type === 'youtube' && video.videoId) {
        // Would need YouTube API for full metadata
        return {
          platform: 'youtube',
          videoId: video.videoId,
          thumbnail: `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
          watchUrl: `https://www.youtube.com/watch?v=${video.videoId}`
        };
      }

      if (video.type === 'vimeo' && video.videoId) {
        // Would need Vimeo API for full metadata
        return {
          platform: 'vimeo',
          videoId: video.videoId,
          watchUrl: `https://vimeo.com/${video.videoId}`
        };
      }

      return video;
    } catch (error) {
      logger.error('Failed to get video info:', error);
      return video;
    }
  }
}

module.exports = VideoScraper;