// src/controllers/asset.controller.js

const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const ImageProcessor = require('../ai/processors/ImageProcessor');
const logger = require('../utils/logger');

const imageProcessor = new ImageProcessor();

module.exports = {
  // GET /api/assets
  async list(req, res, next) {
    try {
      const userId = req.user?.id;
      const { type } = req.query || {};
      await supabaseClient.initialize();
      const data = await supabaseClient.getAssetsByUserId(userId, { type });
      res.json({ success: true, data });
    } catch (err) {
      logger.error('List assets failed', err);
      next(err);
    }
  },

  // POST /api/assets/upload (expects multer file in req.file)
  async upload(req, res, next) {
    try {
      const userId = req.user?.id;
      const file = req.file; // { buffer, originalname, mimetype }
      if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      // Derive bucket and path
      const bucket = process.env.SUPABASE_ASSETS_BUCKET || 'assets';
      const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const path = `${userId}/${id}.${ext}`;

      await supabaseClient.initialize();

      // Optionally optimize images
      let buffer = file.buffer;
      let metadata = {};
      if ((file.mimetype || '').startsWith('image/')) {
        try {
          metadata = await imageProcessor.metadata(buffer);
          buffer = await imageProcessor.optimize(buffer, { format: 'webp' });
        } catch (e) {
          logger.warn('Image optimization failed, storing original', e);
        }
      }

      // Upload to Supabase storage
      await supabaseClient.uploadFile(bucket, path, buffer, { contentType: file.mimetype });
      const publicUrl = await supabaseClient.getPublicUrl(bucket, path);

      // Create asset record
      const asset = await supabaseClient.createAsset({
        user_id: userId,
        type: (file.mimetype || '').split('/')[0] || 'file',
        name: file.originalname,
        path,
        bucket,
        url: publicUrl,
        size_bytes: buffer.length,
        metadata,
        created_at: new Date().toISOString()
      });

      res.status(201).json({ success: true, asset });
    } catch (err) {
      logger.error('Upload asset failed', err);
      next(err);
    }
  },

  // DELETE /api/assets/:id
  async remove(req, res, next) {
    try {
      const id = req.params.id;
      await supabaseClient.initialize();
      // Fetch asset
      const supa = supabaseClient.getClient();
      const { data: asset, error } = await supa.from('assets').select('*').eq('id', id).single();
      if (error || !asset) return res.status(404).json({ success: false, error: 'Asset not found' });

      // Delete file from storage
      await supabaseClient.deleteFile(asset.bucket, asset.path);

      // Delete record
      await supa.from('assets').delete().eq('id', id);
      res.json({ success: true });
    } catch (err) {
      logger.error('Delete asset failed', err);
      next(err);
    }
  }
};

