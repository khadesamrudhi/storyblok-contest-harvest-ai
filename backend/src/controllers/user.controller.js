// src/controllers/user.controller.js

const logger = require('../utils/logger');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');

module.exports = {
  // GET /api/users/me
  async me(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });
      await supabaseClient.initialize();
      const user = await supabaseClient.getUserById(userId);
      res.json({ success: true, data: user });
    } catch (err) {
      logger.error('user.me failed', err);
      next(err);
    }
  },

  // GET /api/users/:id
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      await supabaseClient.initialize();
      const user = await supabaseClient.getUserById(id);
      res.json({ success: true, data: user });
    } catch (err) {
      logger.error('user.getById failed', err);
      next(err);
    }
  },

  // POST /api/users
  async create(req, res, next) {
    try {
      await supabaseClient.initialize();
      const now = new Date().toISOString();
      const payload = {
        ...req.body,
        created_at: now,
        updated_at: now
      };
      const data = await supabaseClient.createUser(payload);
      res.status(201).json({ success: true, data });
    } catch (err) {
      logger.error('user.create failed', err);
      next(err);
    }
  },

  // PATCH /api/users/:id
  async update(req, res, next) {
    try {
      const { id } = req.params;
      await supabaseClient.initialize();
      const updates = { ...(req.body || {}), updated_at: new Date().toISOString() };
      const data = await supabaseClient.updateUser(id, updates);
      res.json({ success: true, data });
    } catch (err) {
      logger.error('user.update failed', err);
      next(err);
    }
  }
};

