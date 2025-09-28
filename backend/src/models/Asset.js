// src/models/Asset.js

const db = require('../utils/databaseQueries');

const TABLE = 'assets';

module.exports = {
  async create(payload) {
    return db.insertOne(TABLE, payload);
  },

  async findById(id) {
    return db.findOne(TABLE, { filters: { id } });
  },

  async listByUser(userId, { type = null, limit = 100, offset = 0 } = {}) {
    const filters = { user_id: userId };
    if (type) filters.type = type;
    return db.findMany(TABLE, {
      filters,
      order: { column: 'created_at', ascending: false },
      limit,
      offset
    });
  },

  async list({ filters = {}, order = { column: 'created_at', ascending: false }, limit = 100, offset = 0 } = {}) {
    return db.findMany(TABLE, { filters, order, limit, offset });
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

