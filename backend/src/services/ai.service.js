// src/services/ai.service.js

const logger = require('../utils/logger');
const OpenAIClient = require('../ai/models/OpenAIClient.clean');

class AIService {
  constructor() {
    this.client = new OpenAIClient();
  }

  async generateText(prompt, options = {}) {
    try {
      return await this.client.generateCompletion(prompt, options);
    } catch (err) {
      logger.error('AIService.generateText failed', err);
      throw err;
    }
  }

  async summarize(text, maxTokens = 200) {
    try {
      const prompt = `Summarize the following content succinctly in 3-5 bullet points.\n\n${text}`;
      return await this.client.generateCompletion(prompt, { temperature: 0.3, maxTokens });
    } catch (err) {
      logger.error('AIService.summarize failed', err);
      throw err;
    }
  }

  async classify(text, labels = []) {
    try {
      if (!Array.isArray(labels) || labels.length === 0) return { label: '', scores: {} };
      const list = labels.map((l, i) => `${i + 1}. ${l}`).join('\n');
      const prompt = `Classify the text into one of the following labels and return a JSON {label: string, scores: Record<string, number>} where scores are confidence between 0 and 1.\nLabels:\n${list}\n\nText:\n${text}`;
      const raw = await this.client.generateCompletion(prompt, { temperature: 0.1, maxTokens: 200 });
      try {
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
        }
      } catch {}
      return { label: '', scores: {} };
    } catch (err) {
      logger.error('AIService.classify failed', err);
      throw err;
    }
  }

  async extractKeywords(text, count = 10) {
    try {
      const prompt = `Extract up to ${count} important keywords or keyphrases from the text and return as a JSON array of strings.\nText:\n${text}`;
      const raw = await this.client.generateCompletion(prompt, { temperature: 0.2, maxTokens: 150 });
      try {
        const arrStart = raw.indexOf('[');
        const arrEnd = raw.lastIndexOf(']');
        if (arrStart >= 0 && arrEnd > arrStart) {
          const parsed = JSON.parse(raw.slice(arrStart, arrEnd + 1));
          return Array.isArray(parsed) ? parsed.map(String) : [];
        }
      } catch {}
      return [];
    } catch (err) {
      logger.error('AIService.extractKeywords failed', err);
      throw err;
    }
  }
}

module.exports = new AIService();

