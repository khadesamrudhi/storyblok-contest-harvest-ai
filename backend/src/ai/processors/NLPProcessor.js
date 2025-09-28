// src/ai/processors/NLPProcessor.js

const natural = require('natural');

class NLPProcessor {
  constructor() {
    this.wordTokenizer = new natural.WordTokenizer();
    this.sentenceTokenizer = new natural.SentenceTokenizer();
    this.stemmer = natural.PorterStemmer; // English
  }

  tokenize(text = '') {
    return this.wordTokenizer.tokenize(String(text));
  }

  sentences(text = '') {
    return this.sentenceTokenizer.tokenize(String(text));
  }

  stem(word = '') {
    return this.stemmer.stem(String(word));
  }

  stems(tokens = []) {
    return (tokens || []).map(t => this.stem(t));
  }

  ngrams(tokens = [], n = 2) {
    const out = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      out.push(tokens.slice(i, i + n));
    }
    return out;
  }

  normalize(text = '') {
    return String(text).toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  frequencies(tokens = []) {
    const freq = Object.create(null);
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
    return freq;
  }
}

module.exports = NLPProcessor;

