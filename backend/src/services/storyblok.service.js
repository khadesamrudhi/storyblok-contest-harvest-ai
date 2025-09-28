// src/services/storyblok.service.js

const logger = require('../utils/logger');
const StoryblokAPI = require('../integrations/storyblok/StoryblokAPI');

class StoryblokService {
  // CDN reads
  async listStories(params = {}) {
    try {
      const data = await StoryblokAPI.getStories(params);
      return data;
    } catch (err) {
      logger.error('StoryblokService.listStories failed', err);
      throw err;
    }
  }

  async getStory(slug, params = {}) {
    try {
      const data = await StoryblokAPI.getStory(slug, params);
      return data;
    } catch (err) {
      logger.error('StoryblokService.getStory failed', err);
      throw err;
    }
  }

  async getComponents(params = {}) {
    try {
      const data = await StoryblokAPI.getComponents(params);
      return data;
    } catch (err) {
      logger.error('StoryblokService.getComponents failed', err);
      throw err;
    }
  }

  // Management writes
  async createStory(story) {
    try {
      const data = await StoryblokAPI.createStory(story);
      return data;
    } catch (err) {
      logger.error('StoryblokService.createStory failed', err);
      throw err;
    }
  }

  async updateStory(id, story) {
    try {
      const data = await StoryblokAPI.updateStory(id, story);
      return data;
    } catch (err) {
      logger.error('StoryblokService.updateStory failed', err);
      throw err;
    }
  }

  async publishStory(id) {
    try {
      const data = await StoryblokAPI.publishStory(id);
      return data;
    } catch (err) {
      logger.error('StoryblokService.publishStory failed', err);
      throw err;
    }
  }
}

module.exports = new StoryblokService();

