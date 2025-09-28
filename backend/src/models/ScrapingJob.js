// src/models/ScrapingJob.js

const db = require('../utils/databaseQueries');
const { SCRAPING_STATUS } = require('../utils/constants');

const TABLE = 'scraping_jobs';

module.exports = {
  STATUS: SCRAPING_STATUS,

  async create(payload) {
    return db.insertOne(TABLE, payload);
  },

  async findById(id) {
    return db.findOne(TABLE, { filters: { id } });
  },

  async list({ filters = {}, order = { column: 'created_at', ascending: false }, limit = 100, offset = 0 } = {}) {
    return db.findMany(TABLE, { filters, order, limit, offset });
  },

  async listByStatus(status, { limit = 50 } = {}) {
    return db.findMany(TABLE, {
      filters: { status },
      order: { column: 'created_at', ascending: true },
      limit
    });
  },

  async update(id, updates) {
    return db.updateById(TABLE, id, { ...updates, updated_at: new Date().toISOString() });
  },

  async delete(id) {
    return db.deleteById(TABLE, id);
  },

  async markPending(id) {
    return this.update(id, { status: SCRAPING_STATUS.PENDING });
  },

  async markRunning(id) {
    return this.update(id, { status: SCRAPING_STATUS.RUNNING, started_at: new Date().toISOString() });
  },

  async markCompleted(id, results = null) {
    return this.update(id, {
      status: SCRAPING_STATUS.COMPLETED,
      completed_at: new Date().toISOString(),
      results
    });
  },

  async markFailed(id, error_message = '') {
    return this.update(id, {
      status: SCRAPING_STATUS.FAILED,
      error_message,
      completed_at: new Date().toISOString()
    });
  },

  async markCancelled(id) {
    return this.update(id, { status: SCRAPING_STATUS.CANCELLED, updated_at: new Date().toISOString() });
  },

  async updateProgress(id, progress) {
    const value = Math.max(0, Math.min(100, Number(progress) || 0));
    return this.update(id, { progress: value });
  },

  async upsert(payload, onConflict = 'id') {
    return db.upsert(TABLE, payload, onConflict);
  }
};

