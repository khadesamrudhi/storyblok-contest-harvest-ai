// src/integrations/storyblok/StoryblokAPI.js

const axios = require('axios');
const logger = require('../../utils/logger');
const { config, fetchStory } = require('../../config/storyblok');

function managementBase(spaceId) {
  return `https://mapi.storyblok.com/v1/spaces/${spaceId}`;
}

class StoryblokAPI {
  constructor() {
    this.spaceId = config.spaceId;
    this.cdnToken = config.apiToken; // public or private depending on env
    this.mgmtToken = process.env.STORYBLOK_MANAGEMENT_TOKEN || process.env.STORYBLOK_PERSONAL_TOKEN || '';

    if (!this.cdnToken) {
      logger.warn('Storyblok CDN token is not configured. CDN reads will fail until configured.');
    }
  }

  // --- CDN READS ---
  async getStories(params = {}) {
    try {
      return await fetchStory('/stories', params);
    } catch (err) {
      logger.error('StoryblokAPI.getStories failed', { error: err.response?.data || err.message });
      throw err;
    }
  }

  async getStory(slug, params = {}) {
    if (!slug) throw new Error('slug is required');
    try {
      return await fetchStory(`/stories/${slug}`, params);
    } catch (err) {
      logger.error('StoryblokAPI.getStory failed', { slug, error: err.response?.data || err.message });
      throw err;
    }
  }

  async getComponents(params = {}) {
    try {
      return await fetchStory('/components', params);
    } catch (err) {
      logger.error('StoryblokAPI.getComponents failed', { error: err.response?.data || err.message });
      throw err;
    }
  }

  // --- MANAGEMENT WRITES ---
  getManagementClient() {
    if (!this.spaceId || !this.mgmtToken) return null;
    return axios.create({
      baseURL: managementBase(this.spaceId),
      timeout: Number(process.env.STORYBLOK_TIMEOUT_MS || 20000),
      headers: { Authorization: `Bearer ${this.mgmtToken}` }
    });
  }

  async createStory(story) {
    const client = this.getManagementClient();
    if (!client) throw new Error('Storyblok management API is not configured');
    try {
      const { data } = await client.post('/stories', { story });
      return data;
    } catch (err) {
      logger.error('StoryblokAPI.createStory failed', { error: err.response?.data || err.message });
      throw err;
    }
  }

  async updateStory(id, story) {
    const client = this.getManagementClient();
    if (!client) throw new Error('Storyblok management API is not configured');
    try {
      const { data } = await client.put(`/stories/${id}`, { story });
      return data;
    } catch (err) {
      logger.error('StoryblokAPI.updateStory failed', { id, error: err.response?.data || err.message });
      throw err;
    }
  }

  async publishStory(id) {
    const client = this.getManagementClient();
    if (!client) throw new Error('Storyblok management API is not configured');
    try {
      const { data } = await client.put(`/stories/${id}/publish`);
      return data;
    } catch (err) {
      logger.error('StoryblokAPI.publishStory failed', { id, error: err.response?.data || err.message });
      throw err;
    }
  }
}

module.exports = new StoryblokAPI();

