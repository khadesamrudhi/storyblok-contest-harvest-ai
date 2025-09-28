// src/jobs/assetOptimization.js

const axios = require('axios');
const path = require('path');
const { URL } = require('url');
const logger = require('../utils/logger');
const ImageProcessor = require('../ai/processors/ImageProcessor');
const fileUpload = require('../utils/fileUpload');

async function downloadToBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  const contentType = res.headers['content-type'] || 'application/octet-stream';
  return { buffer: Buffer.from(res.data), contentType };
}

// Optimize a single image URL and upload optimized + thumbnails
async function optimizeAssetFromUrl(url, {
  bucket = process.env.SUPABASE_BUCKET || 'public',
  baseFolder = 'optimized',
  format = 'webp',
  maxWidth = 1600,
  maxHeight = 1600,
  createThumbnails = true
} = {}) {
  try {
    const { buffer, contentType } = await downloadToBuffer(url);
    const processor = new ImageProcessor();

    // Analyze & optimize
    const metaBefore = await processor.metadata(buffer);
    const optimized = await processor.optimize(buffer, { maxWidth, maxHeight, format });
    const metaAfter = await processor.metadata(optimized);

    // Upload optimized
    const filename = path.basename(new URL(url).pathname).replace(/\.[^.]+$/, '') + `.${format}`;
    const uploadRes = await fileUpload.upload({
      bucket,
      folder: `${baseFolder}/images`,
      file: optimized,
      filename,
      contentType: `image/${format}`,
      upsert: true
    });

    // Optionally thumbnails
    let thumbs = {};
    if (createThumbnails) {
      const t = await processor.thumbnails(optimized, { small: 256, medium: 512, large: 1024 });
      for (const [name, buf] of Object.entries(t)) {
        try {
          const tRes = await fileUpload.upload({
            bucket,
            folder: `${baseFolder}/images/thumbs`,
            file: buf,
            filename: `${filename.replace(`.${format}`, '')}_${name}.${format}`,
            contentType: `image/${format}`,
            upsert: true
          });
          thumbs[name] = tRes.publicUrl;
        } catch (err) {
          // continue others
        }
      }
    }

    return {
      sourceUrl: url,
      uploaded: uploadRes,
      thumbnails: thumbs,
      meta: { before: metaBefore, after: metaAfter }
    };
  } catch (err) {
    logger.error('Asset optimization failed', { url, error: err.message });
    throw err;
  }
}

module.exports = {
  optimizeAssetFromUrl
};

