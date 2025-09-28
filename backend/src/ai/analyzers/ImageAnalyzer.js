// src/ai/analyzers/ImageAnalyzer.js

const axios = require('axios');
const sharp = require('sharp');
const OpenAIClient = require('../models/OpenAIClient.clean');
const logger = require('../../utils/logger');

class ImageAnalyzer {
  constructor() {
    this.openAI = new OpenAIClient();
  }

  async analyzeImage({ url, buffer, context = '' } = {}) {
    try {
      const imgBuffer = buffer || await this.download(url);
      const meta = await this.getMetadata(imgBuffer);
      const colors = await this.getDominantColors(imgBuffer);
      const heuristics = this.basicHeuristics(meta, colors);
      let altText = '';
      try { altText = await this.openAI.generateAltText(context || heuristics.description || 'image', url || null); } catch {}

      return {
        source: url || 'buffer',
        metadata: meta,
        dominant_colors: colors,
        heuristics,
        suggested_alt: altText
      };
    } catch (err) {
      logger.error('Image analysis failed', err);
      throw err;
    }
  }

  async download(url) {
    if (!url) throw new Error('Image URL is required when buffer is not provided');
    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    return Buffer.from(resp.data);
  }

  async getMetadata(buffer) {
    const s = sharp(buffer);
    const m = await s.metadata();
    return {
      format: m.format,
      width: m.width,
      height: m.height,
      space: m.space,
      has_alpha: m.hasAlpha || false,
      orientation: m.orientation || null,
      size_estimate_bytes: buffer.length
    };
  }

  async getDominantColors(buffer, count = 5) {
    // Downscale for speed, get raw pixels and sample
    const { data, info } = await sharp(buffer).resize(64, 64, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const colorMap = new Map();
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Quantize to reduce bins
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
    const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, count);
    const total = info.width * info.height;
    return sorted.map(([rgb, freq]) => {
      const [r, g, b] = rgb.split(',').map(Number);
      return {
        rgb: { r, g, b },
        hex: `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`,
        ratio: Math.round((freq / total) * 1000) / 10
      };
    });
  }

  basicHeuristics(meta, colors) {
    const aspect = meta.width && meta.height ? Math.round((meta.width / meta.height) * 100) / 100 : null;
    let orientation = 'square';
    if (aspect && aspect > 1.1) orientation = 'landscape';
    else if (aspect && aspect < 0.9) orientation = 'portrait';
    const sizeClass = meta.width >= 1200 || meta.height >= 1200 ? 'large' : meta.width >= 600 || meta.height >= 600 ? 'medium' : 'small';
    const primaryColor = colors?.[0]?.hex || '#000000';
    const description = `A ${sizeClass} ${orientation} ${meta.format?.toUpperCase() || ''} image`; 
    return { aspect_ratio: aspect, orientation, size_class: sizeClass, primary_color: primaryColor, description };
  }
}

module.exports = ImageAnalyzer;

