// src/ai/processors/ImageProcessor.js

const sharp = require('sharp');

class ImageProcessor {
  // Returns sharp metadata plus buffer size
  async metadata(buffer) {
    const m = await sharp(buffer).metadata();
    return {
      format: m.format,
      width: m.width,
      height: m.height,
      space: m.space,
      has_alpha: m.hasAlpha || false,
      orientation: m.orientation || null,
      channels: m.channels,
      size_estimate_bytes: buffer.length
    };
  }

  // Resize with fit options. Returns Buffer in original format by default
  async resize(buffer, { width, height, fit = 'cover', position = 'center' } = {}) {
    return sharp(buffer).resize({ width, height, fit, position }).toBuffer();
  }

  // Convert format with optional quality (for lossy formats)
  async convert(buffer, format = 'webp', options = {}) {
    const img = sharp(buffer);
    switch (format) {
      case 'jpeg': return img.jpeg({ quality: 80, mozjpeg: true, ...options }).toBuffer();
      case 'png': return img.png({ compressionLevel: 9, palette: true, ...options }).toBuffer();
      case 'webp': return img.webp({ quality: 80, effort: 4, ...options }).toBuffer();
      case 'avif': return img.avif({ quality: 50, effort: 4, ...options }).toBuffer();
      default: return img.toFormat(format, options).toBuffer();
    }
  }

  // Optimize: optionally resize to max dimensions, then convert to target format
  async optimize(buffer, { maxWidth = 1600, maxHeight = 1600, format = 'webp', quality } = {}) {
    let img = sharp(buffer);
    const m = await img.metadata();
    const width = m.width || 0;
    const height = m.height || 0;
    if (width > maxWidth || height > maxHeight) {
      const scale = Math.min(maxWidth / (width || maxWidth), maxHeight / (height || maxHeight));
      const newW = Math.max(1, Math.floor(width * scale));
      const newH = Math.max(1, Math.floor(height * scale));
      img = img.resize(newW, newH, { fit: 'inside' });
    }
    switch (format) {
      case 'jpeg': return img.jpeg({ quality: quality ?? 80, mozjpeg: true }).toBuffer();
      case 'png': return img.png({ compressionLevel: 9, palette: true }).toBuffer();
      case 'avif': return img.avif({ quality: quality ?? 50, effort: 4 }).toBuffer();
      default: return img.webp({ quality: quality ?? 80, effort: 4 }).toBuffer();
    }
  }

  // Generate a set of thumbnails (returns map of name->buffer)
  async thumbnails(buffer, sizes = { small: 256, medium: 512, large: 1024 }) {
    const out = {};
    for (const [name, size] of Object.entries(sizes || {})) {
      out[name] = await sharp(buffer).resize(size, size, { fit: 'inside' }).toBuffer();
    }
    return out;
  }

  // Extract a quantized color palette from image
  async palette(buffer, count = 6) {
    const { data, info } = await sharp(buffer).resize(64, 64, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const colorMap = new Map();
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
    const total = info.width * info.height;
    const top = [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, count);
    return top.map(([rgb, freq]) => {
      const [r, g, b] = rgb.split(',').map(Number);
      return {
        rgb: { r, g, b },
        hex: `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`,
        ratio: Math.round((freq / total) * 1000) / 10
      };
    });
  }
}

module.exports = ImageProcessor;

