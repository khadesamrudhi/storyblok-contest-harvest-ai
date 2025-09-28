// src/models/Trend.js

const db = require('../utils/databaseQueries');

const TABLE = 'trends';

module.exports = {
  async create(payload) {
    return db.insertOne(TABLE, payload);
  },

  async findById(id) {
    return db.findOne(TABLE, { filters: { id } });
  },

  async list({ filters = {}, order = { column: 'created_at', ascending: false }, limit = 100, offset = 0 } = {}) {
    return db.findMany(TABLE, { filters, order, limit, offset });
  },

  async listByCategory(category, { limit = 50 } = {}) {
    return db.findMany(TABLE, {
      filters: { category },
      order: { column: 'trend_score', ascending: false },
      limit
    });
  },

  async update(id, updates) {
    return db.updateById(TABLE, id, { ...updates, updated_at: new Date().toISOString() });
  },

  async delete(id) {
    return db.deleteById(TABLE, id);
  },

  async upsert(payload, onConflict = 'id') {
    return db.upsert(TABLE, payload, onConflict);
  }
};

