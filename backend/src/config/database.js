// src/config/database.js

require('dotenv').config();

const config = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

function assertConfigured() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY. Please set them in your environment or .env file.');
  }
}

function createSupabaseClient() {
  const { createClient } = require('@supabase/supabase-js');
  assertConfigured();
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });
}

module.exports = { config, assertConfigured, createSupabaseClient };

