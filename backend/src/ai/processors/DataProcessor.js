// src/ai/processors/DataProcessor.js

class DataProcessor {
  // Text utilities
  cleanText(str = '') {
    if (typeof str !== 'string') return '';
    // Strip HTML tags and decode basic entities
    const noTags = str.replace(/<[^>]*>/g, ' ');
    const decoded = noTags
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
    return this.normalizeWhitespace(decoded);
  }

  normalizeWhitespace(str = '') {
    return String(str).replace(/\s+/g, ' ').trim();
  }

  truncate(str = '', maxLen = 200, ellipsis = '…') {
    const s = String(str);
    return s.length > maxLen ? s.slice(0, Math.max(0, maxLen - 1)) + ellipsis : s;
  }

  // Array/Object utilities
  dedupeArray(arr = []) { return Array.from(new Set(arr)); }

  uniqueByKey(arr = [], key) {
    const seen = new Set();
    return (arr || []).filter(item => {
      const val = item?.[key];
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  }

  groupBy(arr = [], key) {
    return (arr || []).reduce((m, item) => {
      const k = typeof key === 'function' ? key(item) : item?.[key];
      if (!m[k]) m[k] = [];
      m[k].push(item);
      return m;
    }, {});
  }

  chunkArray(arr = [], size = 100) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  // Basic stats for numbers
  stats(numbers = []) {
    const vals = (numbers || []).map(Number).filter(n => Number.isFinite(n));
    if (!vals.length) return { count: 0, min: 0, max: 0, mean: 0, p50: 0, p90: 0 };
    vals.sort((a, b) => a - b);
    const sum = vals.reduce((a, b) => a + b, 0);
    const pct = p => vals[Math.min(vals.length - 1, Math.floor((p / 100) * vals.length))];
    return {
      count: vals.length,
      min: vals[0],
      max: vals[vals.length - 1],
      mean: Math.round((sum / vals.length) * 1000) / 1000,
      p50: pct(50),
      p90: pct(90)
    };
  }
}

module.exports = DataProcessor;

