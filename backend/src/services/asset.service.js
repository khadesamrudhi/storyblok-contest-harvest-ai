// src/services/asset.service.js

const logger = require('../utils/logger');
const { optimizeAssetFromUrl } = require('../jobs/assetOptimization');

class AssetService {
  async optimizeFromUrl(url, options = {}) {
    try {
      return await optimizeAssetFromUrl(url, options);
    } catch (err) {
      logger.error('AssetService.optimizeFromUrl failed', { url, error: err.message });
      throw err;
    }
  }

  async optimizeMany(urls = [], options = {}) {
    const results = [];
    for (const url of urls) {
      try {
        const r = await this.optimizeFromUrl(url, options);
        results.push({ url, ok: true, result: r });
      } catch (err) {
        results.push({ url, ok: false, error: err.message });
      }
    }
    return results;
  }
}

module.exports = new AssetService();

