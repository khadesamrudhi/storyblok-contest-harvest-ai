// src/integrations/storyblok/AssetSync.js

const axios = require('axios');
const path = require('path');
const { URL } = require('url');
const logger = require('../../utils/logger');
const StoryblokAPI = require('./StoryblokAPI');
const fileUpload = require('../../utils/fileUpload');

function findAssetsInObject(obj, accumulator = new Set()) {
  if (!obj || typeof obj !== 'object') return accumulator;

  // Common Storyblok asset fields: filename (for images/files), image, file, etc.
  const candidateFields = ['filename', 'file', 'image', 'src', 'url'];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'string' && candidateFields.includes(key)) {
      if (/^https?:\/\//i.test(val)) accumulator.add(val);
    } else if (val && typeof val === 'object') {
      findAssetsInObject(val, accumulator);
    }
  }
  return accumulator;
}

class AssetSync {
  // Extract asset URLs from an array of stories
  extractFromStories(stories = []) {
    const urls = new Set();
    for (const s of stories) {
      findAssetsInObject(s?.content || {}, urls);
    }
    return Array.from(urls);
  }

  // Download a remote asset to Buffer
  async download(url) {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    const contentType = res.headers['content-type'] || 'application/octet-stream';
    return { buffer: Buffer.from(res.data), contentType };
  }

  // Import one asset to Supabase storage
  async importAsset(url, { bucket = process.env.SUPABASE_BUCKET || 'public', baseFolder = 'storyblok' } = {}) {
    try {
      const { buffer, contentType } = await this.download(url);
      const u = new URL(url);
      const filename = path.basename(u.pathname);
      const folder = `${baseFolder}/assets/${u.hostname}`;
      const uploaded = await fileUpload.upload({ bucket, folder, file: buffer, filename, contentType, upsert: true });
      return uploaded;
    } catch (err) {
      logger.error('AssetSync.importAsset failed', { url, error: err.message });
      throw err;
    }
  }

  // High-level: fetch stories and import all discovered assets
  async syncAllAssets({ starts_with, perPage = 25, version, maxPages = 50, bucket, baseFolder } = {}) {
    let page = 1;
    let imported = [];
    while (page <= maxPages) {
      const params = {
        page,
        per_page: Math.min(perPage, 100),
        ...(starts_with ? { starts_with } : {}),
        ...(version ? { version } : {})
      };
      const data = await StoryblokAPI.getStories(params);
      const stories = data?.stories || [];
      if (stories.length === 0) break;

      const urls = this.extractFromStories(stories);
      for (const url of urls) {
        try {
          const res = await this.importAsset(url, { bucket, baseFolder });
          imported.push({ url, path: res.path, publicUrl: res.publicUrl });
        } catch (err) {
          // Continue with other assets
        }
      }

      if ((data.total || 0) <= page * Math.min(perPage, 100)) break;
      page += 1;
    }
    return imported;
  }
}

module.exports = new AssetSync();

