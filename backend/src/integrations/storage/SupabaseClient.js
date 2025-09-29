// src/integrations/storage/SupabaseClient.js

const { createClient } = require('@supabase/supabase-js');
const logger = require('../../utils/logger');
class SupabaseClient {
  constructor() {
    this.supabase = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      // Prefer a service role key if provided, fall back to anon key for client-side operations
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.');
      }
      logger.info('Supabase env loaded', { urlLen: supabaseUrl.length, keyLen: supabaseKey.length });
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });
      logger.info('Supabase client created');

      // Test connection
      const { data, error } = await this.supabase
        .from('scraping_jobs')
        .select('*', { count: 'exact', head: true });
      if (error) {
        logger.error('Supabase probe error', { code: error.code, details: error.details, hint: error.hint, message: error.message });
        if (error.code !== 'PGRST116') throw error;
      } else {
        logger.info('Supabase probe ok');
      }
      this.isInitialized = true;
      logger.info('Supabase client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Supabase client:', { message: error && error.message, stack: error && error.stack, error });
      throw error;
    }
  }

  getClient() {
    if (!this.isInitialized) {
      throw new Error('Supabase client not initialized. Call initialize() first.');
    }
    return this.supabase;
  }

  // User operations
  async createUser(userData) {
    const { data, error } = await this.supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserById(userId) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(userId, updates) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Competitor operations
  async createCompetitor(competitorData) {
    const { data, error } = await this.supabase
      .from('competitors')
      .insert([competitorData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCompetitorsByUserId(userId, options = {}) {
    let query = this.supabase
      .from('competitors')
      .select('*');

    // If no user provided, return latest globally (hackathon/demo mode)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Optional ordering and limit
    const orderColumn = options.orderBy || 'created_at';
    const ascending = !!options.ascending;
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query.order(orderColumn, { ascending });

    if (error) throw error;
    return data;
  }

  // Return competitors that are considered stale: either never scraped (last_scraped is null)
  // or last_scraped is older than the provided ISO cutoff timestamp.
  async getStaleCompetitors(userId, staleBeforeISO, limit = 50) {
    // Query 1: never scraped
    let q1 = this.supabase
      .from('competitors')
      .select('*')
      .is('last_scraped', null);
    if (userId) q1 = q1.eq('user_id', userId);

    // Query 2: scraped before cutoff
    let q2 = this.supabase
      .from('competitors')
      .select('*')
      .lt('last_scraped', staleBeforeISO);
    if (userId) q2 = q2.eq('user_id', userId);

    const [neverScraped, olderThanCutoff] = await Promise.all([
      q1.order('created_at', { ascending: true }).limit(limit),
      q2.order('last_scraped', { ascending: true }).limit(limit)
    ]);

    if (neverScraped.error) throw neverScraped.error;
    if (olderThanCutoff.error) throw olderThanCutoff.error;

    // Merge unique by id and sort: nulls first, then oldest last_scraped
    const map = new Map();
    const push = (arr) => {
      for (const item of arr.data || []) {
        if (!map.has(item.id)) map.set(item.id, item);
      }
    };
    push(neverScraped);
    push(olderThanCutoff);

    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      const as = a.last_scraped ? new Date(a.last_scraped).getTime() : 0;
      const bs = b.last_scraped ? new Date(b.last_scraped).getTime() : 0;
      // Put null (0) first, then ascending by timestamp
      return as - bs;
    });

    return merged.slice(0, limit);
  }

  async updateCompetitor(competitorId, updates) {
    const { data, error } = await this.supabase
      .from('competitors')
      .update(updates)
      .eq('id', competitorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCompetitor(competitorId) {
    const { data, error } = await this.supabase
      .from('competitors')
      .delete()
      .eq('id', competitorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Scraping job operations
  async createScrapingJob(jobData) {
    const { data, error } = await this.supabase
      .from('scraping_jobs')
      .insert([jobData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateScrapingJob(jobId, updates) {
    const { data, error } = await this.supabase
      .from('scraping_jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getScrapingJobsByStatus(status, limit = 50) {
    const { data, error } = await this.supabase
      .from('scraping_jobs')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Asset operations
  async createAsset(assetData) {
    const { data, error } = await this.supabase
      .from('assets')
      .insert([assetData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAssetsByUserId(userId, filters = {}) {
    let query = this.supabase
      .from('assets')
      .select('*');

    // If no user provided, return latest globally (hackathon/demo mode)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Trend operations
  async createTrend({ keyword, category = 'general', trend_score = 0, data = {}, created_at = new Date().toISOString() }) {
    const { data: inserted, error } = await this.supabase
      .from('trends')
      .insert([{ keyword, category, trend_score, data, created_at }])
      .select()
      .single();
    if (error) throw error;
    return inserted;
  }


  async getTrendsByCategory(category, limit = 20) {
    const { data, error } = await this.supabase
      .from('trends')
      .select('*')
      .eq('category', category)
      .order('trend_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getLatestTrends(limit = 50) {
    const { data, error } = await this.supabase
      .from('trends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Content operations
  async createContent(contentData) {
    const { data, error } = await this.supabase
      .from('content')
      .insert([contentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getContentByUserId(userId) {
    const { data, error } = await this.supabase
      .from('content')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Analysis operations
  async createAnalysis(analysisData) {
    const { data, error } = await this.supabase
      .from('analyses')
      .insert([analysisData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAnalysesByUserId(userId, type = null) {
    let query = this.supabase
      .from('analyses')
      .select('*')
      .eq('user_id', userId);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // File upload operations
  async uploadFile(bucket, path, file, options = {}) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        ...options
      });

    if (error) throw error;
    return data;
  }

  async deleteFile(bucket, path) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return data;
  }

  async getPublicUrl(bucket, path) {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Generic query method
  async query(tableName, options = {}) {
    let query = this.supabase.from(tableName);

    if (options.select) {
      query = query.select(options.select);
    } else {
      query = query.select('*');
    }

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }
}

// Create singleton instance
const supabaseClient = new SupabaseClient();

// Initialize database function
async function initializeDatabase() {
  try {
    await supabaseClient.initialize();
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

module.exports = {
  supabaseClient,
  initializeDatabase
};