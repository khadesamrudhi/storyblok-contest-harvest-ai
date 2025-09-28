// src/controllers/auth.controller.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const logger = require('../utils/logger');

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn });
}

module.exports = {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body || {};
      if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });

      await supabaseClient.initialize();
      const supa = supabaseClient.getClient();

      // Check if exists
      const { data: exists, error: existsErr } = await supa.from('users').select('id').eq('email', email).maybeSingle();
      if (existsErr) throw existsErr;
      if (exists) return res.status(409).json({ success: false, error: 'Email already registered' });

      const hash = await bcrypt.hash(password, 10);
      const user = await supabaseClient.createUser({ email, password_hash: hash, name: name || '', created_at: new Date().toISOString() });
      const token = signToken(user);
      res.status(201).json({ success: true, user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (err) {
      logger.error('register failed', err);
      next(err);
    }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });

      await supabaseClient.initialize();
      const supa = supabaseClient.getClient();
      const { data: user, error } = await supa.from('users').select('*').eq('email', email).single();
      if (error) return res.status(401).json({ success: false, error: 'Invalid credentials' });

      const ok = await bcrypt.compare(password, user.password_hash || '');
      if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });

      const token = signToken(user);
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (err) {
      logger.error('login failed', err);
      next(err);
    }
  },

  // GET /api/auth/me
  async me(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      await supabaseClient.initialize();
      const user = await supabaseClient.getUserById(userId);
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      logger.error('me failed', err);
      next(err);
    }
  },

  // PATCH /api/auth/profile
  async updateProfile(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const { name } = req.body || {};
      await supabaseClient.initialize();
      const updated = await supabaseClient.updateUser(userId, { name });
      res.json({ success: true, user: { id: updated.id, email: updated.email, name: updated.name } });
    } catch (err) {
      logger.error('updateProfile failed', err);
      next(err);
    }
  },

  // PATCH /api/auth/password
  async changePassword(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const { currentPassword, newPassword } = req.body || {};
      await supabaseClient.initialize();
      const supa = supabaseClient.getClient();
      const { data: user, error } = await supa.from('users').select('*').eq('id', userId).single();
      if (error) throw error;
      const ok = await bcrypt.compare(currentPassword || '', user.password_hash || '');
      if (!ok) return res.status(400).json({ success: false, error: 'Current password is incorrect' });
      const hash = await bcrypt.hash(newPassword, 10);
      await supabaseClient.updateUser(userId, { password_hash: hash });
      res.json({ success: true, message: 'Password updated' });
    } catch (err) {
      logger.error('changePassword failed', err);
      next(err);
    }
  }
};

