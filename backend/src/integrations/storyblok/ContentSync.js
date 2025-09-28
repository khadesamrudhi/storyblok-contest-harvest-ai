// src/integrations/storyblok/ContentSync.js

const logger = require('../../utils/logger');
const StoryblokAPI = require('./StoryblokAPI');
const db = require('../../utils/databaseQueries');

class ContentSync {
  // Fetch all stories from Storyblok with pagination
  async fetchAllStories({ starts_with, perPage = 25, version, maxPages = 200 } = {}) {
    const stories = [];
    let page = 1;
    let total = Infinity;

    while (stories.length < total && page <= maxPages) {
      const params = {
        page,
        per_page: Math.min(perPage, 100),
        ...(starts_with ? { starts_with } : {}),
        ...(version ? { version } : {})
      };
      const data = await StoryblokAPI.getStories(params);
      const batch = data?.stories || [];
      total = Number(data?.total || (stories.length + batch.length));
      stories.push(...batch);
      logger.info('ContentSync: fetched page', { page, count: batch.length, total });
      if (batch.length === 0) break;
      page += 1;
    }

    return stories;
  }

  // Save or update stories into Supabase 'content' table
  async persistStories(stories = [], { userId = null } = {}) {
    const saved = [];
    for (const s of stories) {
      try {
        const payload = {
          id: s.uuid || undefined,
          user_id: userId,
          type: 'storyblok_story',
          content_title: s.name,
          content_type: s.content?.component || 'storyblok',
          content_preview: JSON.stringify({ slug: s.full_slug, id: s.id }).slice(0, 200),
          results: s,
          created_at: new Date(s.first_published_at || s.created_at || Date.now()).toISOString()
        };

        // Upsert based on UUID if available, otherwise slug
        if (s.uuid) {
          await db.upsert('content', payload, 'id');
        } else {
          // No UUID? Use generic insert
          await db.insertOne('content', payload);
        }
        saved.push({ id: payload.id || s.uuid, slug: s.full_slug });
      } catch (err) {
        logger.error('ContentSync.persistStories failed', { slug: s.full_slug, error: err.message });
      }
    }
    return saved;
  }
}

module.exports = new ContentSync();

