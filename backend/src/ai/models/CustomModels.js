// src/ai/models/CustomModels.js

// Lightweight, dependency-friendly NLP utilities that work offline
// Uses: natural, sentiment (already present in package.json)

const natural = require('natural');
const Sentiment = require('sentiment');
const logger = require('../../utils/logger');

const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;
const sentiment = new Sentiment();

// Compute a simple set of keywords using TF-IDF for a single document context
function extractKeywords(text, topN = 10) {
  if (!text || typeof text !== 'string') return [];
  const tfidf = new TfIdf();
  tfidf.addDocument(text);
  return tfidf
    .listTerms(0)
    .filter(t => t.term && /[a-z0-9]/i.test(t.term))
    .slice(0, topN)
    .map(t => ({ term: t.term, score: t.tfidf }));
}

// Simple heuristic summary: take highest scoring sentences by keyword overlap
function summarize(text, maxSentences = 3) {
  if (!text || typeof text !== 'string') return '';
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  if (sentences.length <= maxSentences) return sentences.join(' ');

  const keywords = new Set(extractKeywords(text, 20).map(k => k.term.toLowerCase()));
  const scored = sentences.map(s => {
    const tokens = tokenizer.tokenize(s.toLowerCase());
    const score = tokens.reduce((acc, w) => acc + (keywords.has(w) ? 1 : 0), 0);
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, maxSentences).map(x => x.s);
  return top.join(' ');
}

// Sentiment analysis wrapper
function analyzeSentiment(text) {
  const res = sentiment.analyze(text || '');
  const label = res.score > 0 ? 'positive' : res.score < 0 ? 'negative' : 'neutral';
  return {
    score: res.score,
    comparative: res.comparative,
    label,
    positive: res.positive,
    negative: res.negative
  };
}

// Very lightweight similarity scoring using Jaro-Winkler between strings
function stringSimilarity(a, b) {
  return natural.JaroWinklerDistance(String(a || ''), String(b || ''));
}

// Zero-shot-ish classification: choose label whose name is most similar to the text or its keywords
function classify(text, candidateLabels = []) {
  const labels = (candidateLabels || []).map(String);
  if (!text || labels.length === 0) return { label: null, scores: {}, labels };
  const keyTerms = extractKeywords(text, 10).map(k => k.term);
  const joined = keyTerms.join(' ');
  const scores = {};
  for (const lbl of labels) {
    // score: similarity to label + similarity to label keywords
    const s1 = stringSimilarity(text, lbl);
    const s2 = stringSimilarity(joined, lbl);
    scores[lbl] = Math.round(((s1 * 0.4 + s2 * 0.6) * 1000)) / 1000;
  }
  const best = labels.slice().sort((a, b) => (scores[b] - scores[a]))[0] || null;
  return { label: best, scores, labels };
}

// Naive embedding: frequency vector over top-N vocabulary of this single document
// Returns an object with vocab and vector to enable downstream cosine similarity if needed
function embed(text, vocabSize = 64) {
  const tokens = tokenizer.tokenize((text || '').toLowerCase()).filter(t => /[a-z0-9]/.test(t));
  const freq = tokens.reduce((m, w) => (m[w] = (m[w] || 0) + 1, m), {});
  const vocab = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, vocabSize).map(([w]) => w);
  const vector = vocab.map(w => freq[w] || 0);
  return { vocab, vector };
}

module.exports = {
  extractKeywords,
  summarize,
  analyzeSentiment,
  stringSimilarity,
  classify,
  embed
};

