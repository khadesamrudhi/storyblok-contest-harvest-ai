// src/services/content.service.js

const logger = require('../utils/logger');
const StoryblokService = require('./storyblok.service');

class ContentService {
  async listStories(params = {}) {
    try {
      return await StoryblokService.listStories(params);
    } catch (err) {
      logger.error('ContentService.listStories failed', err);
      throw err;
    }
  }

  async getStory(slug, params = {}) {
    try {
      return await StoryblokService.getStory(slug, params);
    } catch (err) {
      logger.error('ContentService.getStory failed', err);
      throw err;
    }
  }

  async createStory(story) {
    try {
      return await StoryblokService.createStory(story);
    } catch (err) {
      logger.error('ContentService.createStory failed', err);
      throw err;
    }
  }

  async updateStory(id, story) {
    try {
      return await StoryblokService.updateStory(id, story);
    } catch (err) {
      logger.error('ContentService.updateStory failed', err);
      throw err;
    }
  }

  async publishStory(id) {
    try {
      return await StoryblokService.publishStory(id);
    } catch (err) {
      logger.error('ContentService.publishStory failed', err);
      throw err;
    }
  }
}

module.exports = new ContentService();

