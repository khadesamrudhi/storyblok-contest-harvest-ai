import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Example endpoints – update paths to match backend once available
export const CompetitorAPI = {
  list: (params = {}) => api.get('/api/competitors', { params }),
  create: (payload) => api.post('/api/competitors', payload),
  get: (id) => api.get(`/api/competitors/${id}`),
};

export const AssetAPI = {
  list: (params = {}) => api.get('/api/assets', { params }),
  upload: (formData) => api.post('/api/assets/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const TrendAPI = {
  latest: (params = {}) => api.get('/api/trends/latest', { params }),
  analyze: (payload) => api.post('/api/trends/analyze', payload),
};

export const InsightAPI = {
  summarize: (payload) => api.post('/api/insights/summarize', payload),
  predict: (payload) => api.post('/api/insights/predict', payload),
};

export const StoryblokAPI = {
  listStories: (params = {}) => api.get('/api/storyblok/stories', { params }),
  getStory: (slug) => api.get(`/api/storyblok/stories/${slug}`),
  syncContent: (payload) => api.post('/api/storyblok/sync', payload),
};

export const wsConfig = {
  url: process.env.REACT_APP_WS_URL || 'ws://localhost:5000',
};

export const ScrapingAPI = {
  enqueue: (payload) => api.post('/api/scraping/enqueue', payload),
  status: (id) => api.get(`/api/scraping/${id}/status`),
  stats: () => api.get('/api/scraping/stats'),
};
