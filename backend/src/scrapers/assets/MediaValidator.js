// src/scrapers/assets/MediaValidator.js

const sharp = require('sharp');
const fileType = require('file-type');
const logger = require('../../utils/logger');

class MediaValidator {
  constructor() {
    this.allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    this.allowedVideoTypes = ['mp4', 'avi', 'mov', 'webm', 'mkv'];
    this.allowedAudioTypes = ['mp3', 'wav', 'ogg', 'aac'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.minImageSize = { width: 100, height: 100 };
  }

  async validateMedia(buffer, originalUrl = '') {
    try {
      // Detect file type
      const type = await fileType.fromBuffer(buffer);
      if (!type) {
        return { valid: false, error: 'Unknown file type' };
      }

      // Check file size
      if (buffer.length > this.maxFileSize) {
        return { valid: false, error: 'File size too large' };
      }

      // Validate based on media type
      if (type.mime.startsWith('image/')) {
        return await this.validateImage(buffer, type);
      } else if (type.mime.startsWith('video/')) {
        return this.validateVideo(buffer, type);
      } else if (type.mime.startsWith('audio/')) {
        return this.validateAudio(buffer, type);
      }

      return { valid: false, error: 'Unsupported media type' };

    } catch (error) {
      logger.error('Media validation failed:', error);
      return { valid: false, error: error.message };
    }
  }

  async validateImage(buffer, type) {
    try {
      // Check allowed image types
      if (!this.allowedImageTypes.includes(type.ext)) {
        return { valid: false, error: `Image type ${type.ext} not allowed` };
      }

      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      
      // Check minimum dimensions
      if (metadata.width < this.minImageSize.width || 
          metadata.height < this.minImageSize.height) {
        return { 
          valid: false, 
          error: `Image too small: ${metadata.width}x${metadata.height}` 
        };
      }

      // Check for corrupt image
      if (!metadata.format) {
        return { valid: false, error: 'Corrupt or invalid image' };
      }

      return {
        valid: true,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length,
          channels: metadata.channels,
          hasAlpha: metadata.hasAlpha
        }
      };

    } catch (error) {
      return { valid: false, error: `Image validation failed: ${error.message}` };
    }
  }

  validateVideo(buffer, type) {
    try {
      // Check allowed video types
      if (!this.allowedVideoTypes.includes(type.ext)) {
        return { valid: false, error: `Video type ${type.ext} not allowed` };
      }

      // Basic video validation (size check already done)
      return {
        valid: true,
        metadata: {
          format: type.ext,
          mime: type.mime,
          size: buffer.length
        }
      };

    } catch (error) {
      return { valid: false, error: `Video validation failed: ${error.message}` };
    }
  }

  validateAudio(buffer, type) {
    try {
      // Check allowed audio types
      if (!this.allowedAudioTypes.includes(type.ext)) {
        return { valid: false, error: `Audio type ${type.ext} not allowed` };
      }

      return {
        valid: true,
        metadata: {
          format: type.ext,
          mime: type.mime,
          size: buffer.length
        }
      };

    } catch (error) {
      return { valid: false, error: `Audio validation failed: ${error.message}` };
    }
  }

  // Quick URL-based validation
  isValidMediaUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      
      const allExtensions = [
        ...this.allowedImageTypes,
        ...this.allowedVideoTypes, 
        ...this.allowedAudioTypes
      ];

      return allExtensions.some(ext => pathname.includes(`.${ext}`));
    } catch {
      return false;
    }
  }

  // Sanitize filename
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9.-]/gi, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100); // Limit length
  }
}

module.exports = MediaValidator;