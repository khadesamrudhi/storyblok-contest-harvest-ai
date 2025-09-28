// src/config/storyblok.js

require('dotenv').config();
const axios = require('axios');

const config = {
  spaceId: process.env.STORYBLOK_SPACE_ID || '',
  apiToken: process.env.STORYBLOK_API_TOKEN || process.env.STORYBLOK_PUBLIC_TOKEN || '',
  previewToken: process.env.STORYBLOK_PREVIEW_TOKEN || '',
  region: process.env.STORYBLOK_REGION || 'eu', // 'us' or 'eu'
  version: process.env.STORYBLOK_VERSION || 'draft' // 'draft' or 'published'
};

function getBaseUrl() {
  const sub = config.region === 'us' ? 'api-us' : 'api';
  return `https://${sub}.storyblok.com/v2/cdn`;
}

// Minimal fetcher for Storyblok CDN API
async function fetchStory(path, params = {}) {
  if (!config.apiToken) throw new Error('Missing STORYBLOK_API_TOKEN or STORYBLOK_PUBLIC_TOKEN');
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const query = { token: config.apiToken, version: config.version, ...params };
  const res = await axios.get(url, { params: query, timeout: Number(process.env.STORYBLOK_TIMEOUT_MS || 20000) });
  return res.data;
}

module.exports = { config, fetchStory };

