// src/ai/processors/SentimentAnalyzer.js

const Sentiment = require('sentiment');
const natural = require('natural');

class SentimentAnalyzer {
  constructor() {
    this.sentiment = new Sentiment();
    this.tokenizer = new natural.WordTokenizer();
  }

  analyze(text = '') {
    const res = this.sentiment.analyze(text || '');
    const label = res.score > 0 ? 'positive' : res.score < 0 ? 'negative' : 'neutral';
    return {
      score: res.score,
      comparative: res.comparative,
      label,
      positive_words: res.positive,
      negative_words: res.negative
    };
  }

  // Basic aspect sentiment using keyword buckets
  // aspects: { aspectName: [keywords...] }
  aspectSentiment(text = '', aspects = {}) {
    const tokens = new Set(this.tokenizer.tokenize(String(text).toLowerCase()));
    const out = {};
    for (const [aspect, keys] of Object.entries(aspects || {})) {
      const present = (keys || []).some(k => tokens.has(String(k).toLowerCase()));
      if (!present) {
        out[aspect] = { score: 0, label: 'neutral', matched: [] };
        continue;
      }
      const res = this.analyze(text);
      out[aspect] = { ...res, matched: (keys || []).filter(k => tokens.has(String(k).toLowerCase())) };
    }
    return out;
  }
}

module.exports = SentimentAnalyzer;

