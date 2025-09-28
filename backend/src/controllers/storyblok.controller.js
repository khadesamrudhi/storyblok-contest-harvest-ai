// src/controllers/storyblok.controller.js

const axios = require('axios');
const logger = require('../utils/logger');
const { config, fetchStory } = require('../config/storyblok');

function getManagementClient() {
  const token = process.env.STORYBLOK_MANAGEMENT_TOKEN || process.env.STORYBLOK_PERSONAL_TOKEN;
  if (!token || !config.spaceId) return null;
  const baseURL = `https://mapi.storyblok.com/v1/spaces/${config.spaceId}`;
  const client = axios.create({
    baseURL,
    timeout: Number(process.env.STORYBLOK_TIMEOUT_MS || 20000),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return client;
}

module.exports = {
  // GET /api/storyblok/stories
  async listStories(req, res, next) {
    try {
      const { page = 1, per_page = 25, starts_with, search_term, with_slug, version } = req.query || {};
      const params = {
        page: Number(page),
        per_page: Math.min(Number(per_page), 100),
        ...(starts_with ? { starts_with } : {}),
        ...(search_term ? { search_term } : {}),
        ...(with_slug ? { with_slug } : {}),
        ...(version ? { version } : {})
      };
      const data = await fetchStory('/stories', params);
      res.json({ success: true, ...data });
    } catch (err) {
      logger.error('storyblok.listStories failed', err);
      next(err);
    }
  },

  // GET /api/storyblok/stories/:slug
  async getStory(req, res, next) {
    try {
      const { slug } = req.params;
      const { version } = req.query || {};
      if (!slug) return res.status(400).json({ success: false, error: 'slug is required' });
      const data = await fetchStory(`/stories/${slug}`, { ...(version ? { version } : {}) });
      res.json({ success: true, ...data });
    } catch (err) {
      logger.error('storyblok.getStory failed', err);
      next(err);
    }
  },

  // GET /api/storyblok/components
  async getComponents(req, res, next) {
    try {
      const data = await fetchStory('/components');
      res.json({ success: true, ...data });
    } catch (err) {
      logger.error('storyblok.getComponents failed', err);
      next(err);
    }
  },

  // POST /api/storyblok/stories
  async createStory(req, res, next) {
    try {
      const client = getManagementClient();
      if (!client) return res.status(501).json({ success: false, error: 'Management API not configured' });
      const payload = req.body || {};
      const { data } = await client.post('/stories', { story: payload.story || payload });
      res.status(201).json({ success: true, data });
    } catch (err) {
      logger.error('storyblok.createStory failed', err);
      next(err);
    }
  },

  // PUT /api/storyblok/stories/:id
  async updateStory(req, res, next) {
    try {
      const client = getManagementClient();
      if (!client) return res.status(501).json({ success: false, error: 'Management API not configured' });
      const { id } = req.params;
      const payload = req.body || {};
      if (!id) return res.status(400).json({ success: false, error: 'id is required' });
      const { data } = await client.put(`/stories/${id}`, { story: payload.story || payload });
      res.json({ success: true, data });
    } catch (err) {
      logger.error('storyblok.updateStory failed', err);
      next(err);
    }
  },

  // POST /api/storyblok/stories/:id/publish
  async publishStory(req, res, next) {
    try {
      const client = getManagementClient();
      if (!client) return res.status(501).json({ success: false, error: 'Management API not configured' });
      const { id } = req.params;
      if (!id) return res.status(400).json({ success: false, error: 'id is required' });
      const { data } = await client.put(`/stories/${id}/publish`);
      res.json({ success: true, data });
    } catch (err) {
      logger.error('storyblok.publishStory failed', err);
      next(err);
    }
  },

  // POST /api/storyblok/webhook
  async webhook(req, res, next) {
    try {
      // You can validate signature here if STORYBLOK_WEBHOOK_SECRET is configured
      logger.info('Storyblok webhook received', {
        event: req.body?.action || 'unknown',
        story_id: req.body?.story_id,
        space_id: req.body?.space_id
      });
      res.json({ success: true });
    } catch (err) {
      logger.error('storyblok.webhook failed', err);
      next(err);
    }
  }
};

