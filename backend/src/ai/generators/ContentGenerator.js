// src/ai/generators/ContentGenerator.js

const OpenAIClient = require('../models/OpenAIClient.clean');
const logger = require('../../utils/logger');

class ContentGenerator {
  constructor() {
    this.openAI = new OpenAIClient();
  }
  /**
   * Generate a structured content package: outline + draft
   * @param {Object} options
   * @param {string} options.topic
   * @param {string} [options.tone="informative"]
   * @param {string} [options.audience="general"]
   * @param {string} [options.format="blog"] - blog, newsletter, linkedin, twitter-thread
   * @param {('short'|'medium'|'long')} [options.length="medium"]
   */
  async generate(options) {
    const { topic, tone = 'informative', audience = 'general', format = 'blog', length = 'medium' } = options || {};
    if (!topic) throw new Error('topic is required');

    try {
      const outline = await this.createOutline({ topic, tone, audience, format });
      const draft = await this.createDraftFromOutline({ topic, outline, tone, audience, format, length });
      return { outline, draft };
    } catch (err) {
      logger.error('Content generation failed', err);
      throw err;
    }
  }

  async createOutline({ topic, tone, audience, format }) {
    const prompt = `Create a concise outline for a ${format} about "${topic}".
Audience: ${audience}
Tone: ${tone}
Return 5-8 bullet points, each a short heading.`;
    try {
      const result = await this.openAI.generateCompletion(prompt, { temperature: 0.7, maxTokens: 300 });
      return this.parseBullets(result);
    } catch (e) {
      logger.warn('OpenAI outline generation failed, using fallback');
      return [
        `Introduction to ${topic}`,
        `Why ${topic} matters`,
        `Key concepts of ${topic}`,
        `${topic} in practice`,
        `Common pitfalls`,
        `Best practices`,
        `Conclusion`
      ];
    }
  }

  async createDraftFromOutline({ topic, outline, tone, audience, format, length }) {
    const lengthHint = length === 'short' ? '300-500 words' : length === 'long' ? '1200-1600 words' : '700-1000 words';
    const list = Array.isArray(outline) ? outline.map((b, i) => `${i + 1}. ${b}`).join('\n') : String(outline);
    const prompt = `Write a ${lengthHint} ${format} draft for the topic "${topic}".
Audience: ${audience}
Tone: ${tone}
Outline:\n${list}\n
Include a compelling intro and a concise conclusion.`;
    try {
      return await this.openAI.generateCompletion(prompt, { temperature: 0.75, maxTokens: 1200 });
    } catch (e) {
      logger.warn('OpenAI draft generation failed, returning stitched outline');
      return list.replace(/\n/g, '\n\n');
    }
  }

  async variations(topic, count = 5, tone = 'informative', format = 'headline') {
    const prompt = `Generate ${count} ${format} variations for: ${topic}. Tone: ${tone}. Return as a bullet list.`;
    try {
      const res = await this.openAI.generateCompletion(prompt, { temperature: 0.9, maxTokens: 300 });
      return this.parseBullets(res).slice(0, count);
    } catch (e) {
      logger.warn('OpenAI variations failed, providing defaults');
      return Array.from({ length: count }).map((_, i) => `${topic} - Variation ${i + 1}`);
    }
  }

  async rewrite(content, instructions = 'Improve clarity and flow while preserving meaning.') {
    try {
      return await this.openAI.improveContent(content, instructions);
    } catch (e) {
      logger.warn('OpenAI rewrite failed, returning original content');
      return content;
    }
  }

  parseBullets(text) {
    if (!text) return [];
    return text
      .split(/\r?\n/)
      .map(l => l.replace(/^[-*\d\.)\s]+/, '').trim())
      .filter(Boolean);
  }
}

module.exports = ContentGenerator;

