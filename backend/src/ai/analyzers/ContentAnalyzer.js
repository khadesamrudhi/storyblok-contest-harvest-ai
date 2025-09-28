// src/ai/analyzers/ContentAnalyzer.js

const natural = require('natural');
const Sentiment = require('sentiment');
const OpenAIClient = require('../models/OpenAIClient.clean');
const logger = require('../../utils/logger');

class ContentAnalyzer {
  constructor() {
    this.openAI = new OpenAIClient();
    this.sentiment = new Sentiment();
  }

  async analyze(content) {
    try {
      const base = this.basicStats(content);
      const readability = this.readability(content);
      const sentiment = this.sentimentResult(content);
      const keywords = this.keywords(content);

      let topics = {};
      let aiInsights = '';
      let performance = {};
      let recommendations = '';

      try { topics = await this.openAI.extractTopics(content); } catch {}
      try { aiInsights = await this.openAI.analyzeContent(content, 'general'); } catch {}
      try { performance = await this.openAI.predictContentPerformance(content, 'blog'); } catch {}
      try { recommendations = await this.openAI.improveContent(content, 'general'); } catch {}

      return {
        ...base,
        readability,
        sentiment,
        keywords,
        topics,
        ai_insights: aiInsights,
        performance_prediction: performance,
        recommendations
      };
    } catch (err) {
      logger.error('Content analysis failed', err);
      throw err;
    }
  }

  basicStats(content) {
    const words = content.trim().split(/\s+/);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200);
    return {
      timestamp: new Date().toISOString(),
      content_length: content.length,
      word_count: wordCount,
      reading_time: readingTime
    };
  }

  readability(content) {
    const sentences = content.split(/[.!?]+/).filter(Boolean);
    const words = content.trim().split(/\s+/).filter(Boolean);
    const syllables = words.reduce((acc, w) => acc + this.countSyllables(w), 0);
    const avgWordsPerSentence = words.length / Math.max(1, sentences.length);
    const avgSyllablesPerWord = syllables / Math.max(1, words.length);
    const flesch = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    const level = flesch >= 90 ? 'Very Easy'
      : flesch >= 80 ? 'Easy'
      : flesch >= 70 ? 'Fairly Easy'
      : flesch >= 60 ? 'Standard'
      : flesch >= 50 ? 'Fairly Difficult'
      : flesch >= 30 ? 'Difficult'
      : 'Graduate';

    return {
      flesch_score: Math.max(0, Math.min(100, Math.round(flesch * 100) / 100)),
      level,
      avg_words_per_sentence: Math.round(avgWordsPerSentence * 100) / 100,
      avg_syllables_per_word: Math.round(avgSyllablesPerWord * 100) / 100
    };
  }

  countSyllables(word) {
    const w = word.toLowerCase()
      .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,'')
      .replace(/^y/, '');
    const matches = w.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  sentimentResult(content) {
    const result = this.sentiment.analyze(content);
    const label = result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'neutral';
    return {
      score: result.score,
      comparative: result.comparative,
      label,
      positive_words: result.positive,
      negative_words: result.negative
    };
  }

  keywords(content, topN = 10) {
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();
    tfidf.addDocument(content);
    return tfidf.listTerms(0).slice(0, topN).map(t => ({ term: t.term, score: t.tfidf }));
  }
}

module.exports = ContentAnalyzer;

