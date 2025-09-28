// src/ai/models/OpenAIClient.clean.js

const OpenAI = require('openai');
const logger = require('../../utils/logger');

class OpenAIClient {
  constructor() {
    this.openai = null; // Lazy init to avoid requiring API key at server start
    this.isInitialized = false;
  }

  initialize() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY. Set it in backend/.env before using AI features.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.isInitialized = true;
    logger.info('OpenAI client initialized');
  }

  async generateCompletion(prompt, options = {}) {
    if (!this.isInitialized) this.initialize();

    const model = options.model || 'gpt-3.5-turbo';
    const temperature = options.temperature ?? 0.7;
    const max_tokens = options.maxTokens ?? 1000;

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens,
        ...options
      });
      return response.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      logger.error('OpenAI completion error:', error);
      throw error;
    }
  }

  async analyzeContent(content, analysisType = 'general') {
    const prompts = {
      general: `Analyze the following content and provide insights about its quality, readability, and effectiveness:\n\n${content}`,
      sentiment: `Analyze the sentiment of the following content. Classify as positive, negative, or neutral and explain why:\n\n${content}`,
      keywords: `Extract the main keywords and topics from the following content. List them in order of importance:\n\n${content}`,
      summary: `Provide a concise summary of the following content in 2-3 sentences:\n\n${content}`,
      engagement: `Analyze how engaging this content is and suggest improvements to increase reader engagement:\n\n${content}`,
      seo: `Analyze this content from an SEO perspective and provide optimization recommendations:\n\n${content}`
    };

    const prompt = prompts[analysisType] || prompts.general;
    return await this.generateCompletion(prompt);
  }

  async generateContentSuggestions(topic, contentType = 'blog', targetAudience = 'general') {
    const prompt = `Generate 5 creative ${contentType} content ideas about "${topic}" for a ${targetAudience} audience.\nFor each idea, provide:\n1. A catchy title\n2. A brief description\n3. Key points to cover\n4. Estimated engagement potential (1-10)\n\nFormat the response as JSON.`;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.8 });
      return JSON.parse(response);
    } catch (error) {
      logger.error('Content suggestion generation failed:', error);
      throw error;
    }
  }

  async improveContent(content, improvementType = 'general') {
    const prompts = {
      general: `Improve the following content for better readability and engagement while maintaining its core message:\n\n${content}`,
      seo: `Optimize the following content for SEO while keeping it natural and readable:\n\n${content}`,
      engagement: `Rewrite the following content to make it more engaging and compelling:\n\n${content}`,
      clarity: `Improve the clarity and structure of the following content:\n\n${content}`,
      tone: `Adjust the tone of the following content to be more professional yet approachable:\n\n${content}`
    };

    const prompt = prompts[improvementType] || prompts.general;
    return await this.generateCompletion(prompt, { temperature: 0.6 });
  }

  async generateAltText(imageContext, imageUrl = null) {
    const prompt = `Generate SEO-optimized alt text for an image ${imageUrl ? `(${imageUrl}) ` : ''}in the context of: ${imageContext}. The alt text should be descriptive, concise (under 125 characters), and relevant to the content context.`;
    return await this.generateCompletion(prompt, { maxTokens: 100, temperature: 0.5 });
  }

  async predictContentPerformance(content, contentType = 'blog') {
    const prompt = `Analyze the following ${contentType} content and predict its potential performance metrics:\n\nContent: ${content}\n\nProvide predictions for:\n1. Engagement score (1-10)\n2. Readability score (1-10)\n3. SEO potential (1-10)\n4. Social sharing likelihood (1-10)\n5. Key strengths\n6. Areas for improvement\n7. Target audience fit\n\nFormat response as JSON with numeric scores and string explanations.`;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.3 });
      return JSON.parse(response);
    } catch (error) {
      logger.error('Performance prediction failed:', error);
      throw error;
    }
  }

  async extractTopics(content) {
    const prompt = `Extract and categorize the main topics from the following content.\nGroup them by relevance and provide confidence scores (0-1) for each topic:\n\n${content}\n\nFormat as JSON: {\n  "primary_topics": [{"topic": "string", "confidence": number}],\n  "secondary_topics": [{"topic": "string", "confidence": number}],\n  "keywords": ["string"]\n}`;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.2 });
      return JSON.parse(response);
    } catch (error) {
      logger.error('Topic extraction failed:', error);
      throw error;
    }
  }
}

module.exports = OpenAIClient;
