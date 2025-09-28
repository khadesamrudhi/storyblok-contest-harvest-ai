// src/config/openai.js

require('dotenv').config();

const config = {
  apiKey: process.env.OPENAI_API_KEY || '',
  organization: process.env.OPENAI_ORG || process.env.OPENAI_ORGANIZATION || undefined,
  project: process.env.OPENAI_PROJECT || undefined,
  // sensible defaults; your OpenAIClient may override per-call
  defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 60000)
};

function assertConfigured() {
  if (!config.apiKey) {
    throw new Error('Missing OPENAI_API_KEY. Please set it in your environment or .env file.');
  }
}

module.exports = { config, assertConfigured };

