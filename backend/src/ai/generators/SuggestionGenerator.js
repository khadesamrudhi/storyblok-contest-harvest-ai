// src/ai/generators/SuggestionGenerator.js

const OpenAIClient = require('../models/OpenAIClient.clean');
const logger = require('../../utils/logger');

class SuggestionGenerator {
  constructor() {
    this.openAI = new OpenAIClient();
  }
  async headlines(topicOrContent, count = 10, tone = 'engaging') {
    const prompt = `Generate ${count} compelling headlines with tone ${tone} for the following context. Return as a bullet list.\n\n${topicOrContent}`;
    try {
      const res = await this.openAI.generateCompletion(prompt, { temperature: 0.95, maxTokens: 300 });
      return this.parseBullets(res).slice(0, count);
    } catch (e) {
      logger.warn('Headline generation failed; providing defaults');
      return Array.from({ length: count }).map((_, i) => `Headline idea ${i + 1}`);
    }
  }

  async ctas(purpose = 'newsletter signup', count = 8, tone = 'persuasive') {
    const prompt = `Generate ${count} crisp CTA phrases for ${purpose}. Tone: ${tone}. Each CTA must be under 8 words. Return as a bullet list.`;
    try {
      const res = await this.openAI.generateCompletion(prompt, { temperature: 0.85, maxTokens: 150 });
      return this.parseBullets(res).slice(0, count);
    } catch (e) {
      logger.warn('CTA generation failed; providing defaults');
      return ['Get Started', 'Learn More', 'Try It Free', 'Join Now', 'Subscribe', 'Download Now', 'See How', 'Contact Us'].slice(0, count);
    }
  }

  async imagePrompts(topic, count = 6, style = 'photorealistic') {
    const prompt = `Create ${count} text-to-image prompts for: ${topic}. Style: ${style}. Include subject, setting, mood, lighting, and composition. Return as a bullet list.`;
    try {
      const res = await this.openAI.generateCompletion(prompt, { temperature: 0.9, maxTokens: 240 });
      return this.parseBullets(res).slice(0, count);
    } catch (e) {
      logger.warn('Image prompt generation failed; providing defaults');
      return Array.from({ length: count }).map((_, i) => `${topic}, ${style}, high-detail, soft lighting, rule of thirds #${i + 1}`);
    }
  }

  async socialCaptions(summary, platform = 'twitter', count = 5, tone = 'friendly', addHashtags = true) {
    const prompt = `Generate ${count} ${platform} captions for the following summary. Tone: ${tone}. ${addHashtags ? 'Include relevant hashtags.' : 'No hashtags.'} Each under 220 characters. Return as a bullet list.\n\n${summary}`;
    try {
      const res = await this.openAI.generateCompletion(prompt, { temperature: 0.9, maxTokens: 240 });
      return this.parseBullets(res).slice(0, count);
    } catch (e) {
      logger.warn('Caption generation failed; providing defaults');
      return Array.from({ length: count }).map((_, i) => `Update ${i + 1}: ${summary.slice(0, 80)}${addHashtags ? ' #update' : ''}`);
    }
  }

  async improvements(content, goal = 'improve clarity, SEO, and engagement') {
    const prompt = `Provide actionable suggestions to ${goal} for the content below. Return 5-8 bullets.\n\n${content}`;
    try {
      const res = await this.openAI.generateCompletion(prompt, { temperature: 0.6, maxTokens: 300 });
      return this.parseBullets(res);
    } catch (e) {
      logger.warn('Improvement suggestions failed; providing defaults');
      return [
        'Use shorter sentences and clear subheadings',
        'Front-load value in the introduction',
        'Add concrete examples and data points',
        'Refine keywords and internal links',
        'End with a clear CTA'
      ];
    }
  }

  async abTestVariants(headline, count = 4, tone = 'engaging') {
    const prompt = `Rewrite the headline into ${count} A/B test variants with tone ${tone}. Keep each under 70 characters. Return as a bullet list.\n\n${headline}`;
    try {
      const res = await this.openAI.generateCompletion(prompt, { temperature: 0.9, maxTokens: 180 });
      return this.parseBullets(res).slice(0, count);
    } catch (e) {
      logger.warn('A/B variants failed; providing defaults');
      return Array.from({ length: count }).map((_, i) => `${headline} (Variant ${i + 1})`);
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

module.exports = SuggestionGenerator;

