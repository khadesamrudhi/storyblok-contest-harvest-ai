// src/utils/databaseQueries.js

const logger = require('./logger');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');

// Ensure supabase is initialized before each operation
async function ensureDb() {
  if (!supabaseClient.isInitialized) {
    await supabaseClient.initialize();
  }
  return supabaseClient.getClient();
}

function applyFilters(query, filters = {}) {
  if (!filters) return query;
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (value && typeof value === 'object' && value.op) {
      // Support simple ops: lt, lte, gt, gte, like, ilike, not
      const { op, val } = value;
      switch (op) {
        case 'lt': query = query.lt(key, val); break;
        case 'lte': query = query.lte(key, val); break;
        case 'gt': query = query.gt(key, val); break;
        case 'gte': query = query.gte(key, val); break;
        case 'like': query = query.like(key, val); break;
        case 'ilike': query = query.ilike(key, val); break;
        case 'neq': query = query.neq(key, val); break;
        case 'contains': query = query.contains(key, val); break;
        default: query = query.eq(key, val);
      }
    } else {
      query = query.eq(key, value);
    }
  });
  return query;
}

module.exports = {
  // Generic fetch many
  async findMany(table, { select = '*', filters = {}, order = null, limit = null, offset = null } = {}) {
    await ensureDb();
    try {
      let q = supabaseClient.getClient().from(table).select(select);
      q = applyFilters(q, filters);
      if (order) q = q.order(order.column, { ascending: !!order.ascending });
      if (limit) q = q.limit(Number(limit));
      if (offset) q = q.range(Number(offset), Number(offset) + Number(limit || 100) - 1);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('findMany failed', { table, error: err.message });
      throw err;
    }
  },

  // Fetch single by filters
  async findOne(table, { select = '*', filters = {} } = {}) {
    await ensureDb();
    try {
      let q = supabaseClient.getClient().from(table).select(select).single();
      q = applyFilters(q, filters);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('findOne failed', { table, error: err.message });
      throw err;
    }
  },

  // Insert one
  async insertOne(table, payload) {
    await ensureDb();
    try {
      const { data, error } = await supabaseClient
        .getClient()
        .from(table)
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('insertOne failed', { table, error: err.message });
      throw err;
    }
  },

  // Update by id
  async updateById(table, id, updates, idColumn = 'id') {
    await ensureDb();
    try {
      const { data, error } = await supabaseClient
        .getClient()
        .from(table)
        .update(updates)
        .eq(idColumn, id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('updateById failed', { table, id, error: err.message });
      throw err;
    }
  },

  // Delete by id
  async deleteById(table, id, idColumn = 'id') {
    await ensureDb();
    try {
      const { data, error } = await supabaseClient
        .getClient()
        .from(table)
        .delete()
        .eq(idColumn, id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('deleteById failed', { table, id, error: err.message });
      throw err;
    }
  },

  // Upsert by unique key(s)
  async upsert(table, payload, onConflict) {
    await ensureDb();
    try {
      const { data, error } = await supabaseClient
        .getClient()
        .from(table)
        .upsert(payload, { onConflict })
        .select();
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('upsert failed', { table, error: err.message });
      throw err;
    }
  }
};
