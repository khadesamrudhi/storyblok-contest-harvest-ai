// src/integrations/external/ImageStockAPI.js

const axios = require('axios');
const logger = require('../../utils/logger');

class ImageStockAPI {
  constructor() {
    this.unsplashKey = process.env.UNSPLASH_ACCESS_KEY || null;
    this.pexelsKey = process.env.PEXELS_API_KEY || null;
    this.pixabayKey = process.env.PIXABAY_API_KEY || null;
  }

  // Unified search returning results from available providers
  async searchPhotos({ query, page = 1, perPage = 15, orientation } = {}) {
    if (!query) throw new Error('query is required');
    const tasks = [];
    if (this.unsplashKey) tasks.push(this.searchUnsplash({ query, page, perPage, orientation }));
    if (this.pexelsKey) tasks.push(this.searchPexels({ query, page, perPage, orientation }));
    if (this.pixabayKey) tasks.push(this.searchPixabay({ query, page, perPage, orientation }));

    if (tasks.length === 0) {
      throw new Error('No image provider API keys configured');
    }

    const results = await Promise.allSettled(tasks);
    const photos = [];

    for (const r of results) {
      if (r.status === 'fulfilled') {
        photos.push(...r.value);
      } else {
        logger.warn('Image provider failed', { error: r.reason?.message });
      }
    }

    // Sort by provider rank then by likes if provided
    photos.sort((a, b) => (a.rank - b.rank) || ((b.likes || 0) - (a.likes || 0)));
    return { total: photos.length, photos };
  }

  // --- Providers ---
  async searchUnsplash({ query, page, perPage, orientation }) {
    try {
      const client = axios.create({
        baseURL: 'https://api.unsplash.com',
        headers: { Authorization: `Client-ID ${this.unsplashKey}` },
        timeout: 15000
      });
      const { data } = await client.get('/search/photos', {
        params: {
          query,
          page,
          per_page: perPage,
          ...(orientation ? { orientation } : {})
        }
      });
      return (data.results || []).map((p) => ({
        id: p.id,
        src: p.urls?.regular,
        thumb: p.urls?.thumb,
        width: p.width,
        height: p.height,
        alt: p.alt_description || p.description || 'Unsplash photo',
        photographer: p.user?.name,
        photographer_url: p.user?.links?.html,
        url: p.links?.html,
        provider: 'unsplash',
        rank: 1,
        likes: p.likes
      }));
    } catch (err) {
      logger.error('Unsplash search failed', { error: err.response?.data || err.message });
      throw err;
    }
  }

  async searchPexels({ query, page, perPage, orientation }) {
    try {
      const client = axios.create({
        baseURL: 'https://api.pexels.com/v1',
        headers: { Authorization: this.pexelsKey },
        timeout: 15000
      });
      const { data } = await client.get('/search', {
        params: {
          query,
          page,
          per_page: perPage,
          ...(orientation ? { orientation } : {})
        }
      });
      return (data.photos || []).map((p) => ({
        id: String(p.id),
        src: p.src?.large2x || p.src?.large,
        thumb: p.src?.tiny,
        width: p.width,
        height: p.height,
        alt: p.alt || 'Pexels photo',
        photographer: p.photographer,
        photographer_url: p.photographer_url,
        url: p.url,
        provider: 'pexels',
        rank: 2,
        likes: undefined
      }));
    } catch (err) {
      logger.error('Pexels search failed', { error: err.response?.data || err.message });
      throw err;
    }
  }

  async searchPixabay({ query, page, perPage, orientation }) {
    try {
      const client = axios.create({ baseURL: 'https://pixabay.com/api', timeout: 15000 });
      const { data } = await client.get('/', {
        params: {
          key: this.pixabayKey,
          q: query,
          page,
          per_page: perPage,
          image_type: 'photo',
          ...(orientation ? { orientation } : {})
        }
      });
      return (data.hits || []).map((p) => ({
        id: String(p.id),
        src: p.largeImageURL,
        thumb: p.previewURL,
        width: p.imageWidth,
        height: p.imageHeight,
        alt: p.tags || 'Pixabay photo',
        photographer: p.user,
        photographer_url: `https://pixabay.com/users/${p.user}-${p.user_id}/`,
        url: p.pageURL,
        provider: 'pixabay',
        rank: 3,
        likes: p.likes
      }));
    } catch (err) {
      logger.error('Pixabay search failed', { error: err.response?.data || err.message });
      throw err;
    }
  }

  getAttribution(photo) {
    switch (photo.provider) {
      case 'unsplash':
        return `Photo by ${photo.photographer} on Unsplash`;
      case 'pexels':
        return `Photo by ${photo.photographer} on Pexels`;
      case 'pixabay':
        return `Image by ${photo.photographer} from Pixabay`;
      default:
        return 'Image';
    }
  }
}

module.exports = new ImageStockAPI();

