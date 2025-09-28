// src/integrations/external/SocialMediaAPI.js

const axios = require('axios');
const logger = require('../../utils/logger');

class SocialMediaAPI {
  constructor() {
    // Tokens from env (optional per platform)
    this.twitterToken = process.env.TWITTER_BEARER_TOKEN || process.env.X_BEARER_TOKEN || null;
    this.facebookToken = process.env.FB_PAGE_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || null;
    this.linkedinToken = process.env.LINKEDIN_ACCESS_TOKEN || null;
  }

  // Generic method to post content to a platform
  async post({ platform, content, mediaUrls = [], options = {} }) {
    try {
      switch ((platform || '').toLowerCase()) {
        case 'twitter':
        case 'x':
          return await this.postToTwitter({ content, mediaUrls, options });
        case 'facebook':
          return await this.postToFacebook({ content, mediaUrls, options });
        case 'linkedin':
          return await this.postToLinkedIn({ content, mediaUrls, options });
        default:
          throw new Error('Unsupported platform');
      }
    } catch (err) {
      logger.error('SocialMediaAPI.post failed', { platform, error: err.message });
      throw err;
    }
  }

  // Schedule by returning a payload your job system can enqueue
  async schedule({ platform, content, mediaUrls = [], publishAt, options = {} }) {
    if (!publishAt) throw new Error('publishAt is required for scheduling');
    const payload = { type: 'social_post', platform, content, mediaUrls, options, publishAt };
    logger.info('Social post scheduled (payload returned to enqueue)', payload);
    return payload;
  }

  // --- Twitter/X --- //
  async postToTwitter({ content, mediaUrls = [], options = {} }) {
    if (!this.twitterToken) throw new Error('Twitter/X token not configured');
    // Basic text-only post via v2 tweets endpoint
    const client = axios.create({
      baseURL: 'https://api.twitter.com/2',
      headers: { Authorization: `Bearer ${this.twitterToken}` }
    });

    const body = { text: content };
    try {
      const { data } = await client.post('/tweets', body);
      return { platform: 'twitter', id: data?.data?.id, data };
    } catch (err) {
      logger.error('Twitter post failed', { error: err.response?.data || err.message });
      throw err;
    }
  }

  // --- Facebook Page --- //
  async postToFacebook({ content, mediaUrls = [], options = {} }) {
    if (!this.facebookToken) throw new Error('Facebook Page token not configured');
    const pageId = process.env.FB_PAGE_ID || process.env.META_PAGE_ID;
    if (!pageId) throw new Error('Facebook Page ID not configured');

    const client = axios.create({ baseURL: 'https://graph.facebook.com/v19.0' });

    try {
      // Simple text post
      const { data } = await client.post(`/${pageId}/feed`, null, {
        params: { message: content, access_token: this.facebookToken }
      });
      return { platform: 'facebook', id: data?.id, data };
    } catch (err) {
      logger.error('Facebook post failed', { error: err.response?.data || err.message });
      throw err;
    }
  }

  // --- LinkedIn --- //
  async postToLinkedIn({ content, mediaUrls = [], options = {} }) {
    if (!this.linkedinToken) throw new Error('LinkedIn token not configured');
    const orgId = process.env.LINKEDIN_ORG_ID; // optional: post as organization

    const client = axios.create({
      baseURL: 'https://api.linkedin.com/v2',
      headers: { Authorization: `Bearer ${this.linkedinToken}` }
    });

    try {
      const author = orgId ? `urn:li:organization:${orgId}` : `urn:li:person:${process.env.LINKEDIN_PERSON_URN || 'me'}`;
      const payload = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS' }
      };

      const { data } = await client.post('/ugcPosts', payload);
      return { platform: 'linkedin', id: data?.id, data };
    } catch (err) {
      logger.error('LinkedIn post failed', { error: err.response?.data || err.message });
      throw err;
    }
  }

  // Basic analytics placeholder (extend per platform)
  async analytics({ platform, since, until }) {
    logger.info('SocialMediaAPI.analytics requested', { platform, since, until });
    return { platform, metrics: [], since, until };
  }
}

module.exports = new SocialMediaAPI();

