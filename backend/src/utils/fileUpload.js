// src/utils/fileUpload.js

const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');

function uniqueName(originalName) {
  const ext = path.extname(originalName || '');
  const base = crypto.randomBytes(8).toString('hex');
  return `${Date.now()}_${base}${ext}`;
}

async function ensureDb() {
  if (!supabaseClient.isInitialized) {
    await supabaseClient.initialize();
  }
}

module.exports = {
  // Upload a Buffer or Readable to a bucket/path. Returns public URL if bucket is public.
  async upload({
    bucket = process.env.SUPABASE_BUCKET || 'public',
    folder = '',
    file,
    filename,
    contentType = 'application/octet-stream',
    upsert = false
  }) {
    if (!file) throw new Error('file is required');
    await ensureDb();

    const safeFolder = folder ? folder.replace(/^\/+|\/+$/g, '') + '/' : '';
    const name = filename || uniqueName(typeof file?.name === 'string' ? file.name : 'upload.bin');
    const objectPath = `${safeFolder}${name}`;

    try {
      const { data, error } = await supabaseClient
        .getClient()
        .storage
        .from(bucket)
        .upload(objectPath, file, { contentType, upsert });

      if (error) throw error;

      const publicUrl = supabaseClient.getPublicUrl(bucket, objectPath);
      return { path: objectPath, bucket, publicUrl, data };
    } catch (err) {
      logger.error('fileUpload.upload failed', { bucket, err: err.message });
      throw err;
    }
  },

  // Delete an object from bucket
  async remove({ bucket = process.env.SUPABASE_BUCKET || 'public', path: objectPath }) {
    if (!objectPath) throw new Error('path is required');
    await ensureDb();

    try {
      const { data, error } = await supabaseClient
        .getClient()
        .storage
        .from(bucket)
        .remove([objectPath]);

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      logger.error('fileUpload.remove failed', { bucket, err: err.message });
      throw err;
    }
  }
};
