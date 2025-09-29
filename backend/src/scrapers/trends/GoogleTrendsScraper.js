// GoogleTrendsScraper.js
// Scrapes trending search topics using google-trends-api

const googleTrends = require('google-trends-api');

/**
 * Fetches daily trending searches for a given country.
 * @param {string} [geo='US'] - Country code (e.g., 'US', 'IN', 'GB').
 * @returns {Promise<Array>} Array of trending search topics.
 */
async function getDailyTrends(geo = 'US') {
  try {
    const results = await googleTrends.dailyTrends({ geo });
    const data = JSON.parse(results);
    return (data.default?.trendingSearchesDays?.[0]?.trendingSearches || []).map(item => ({
      title: item.title?.query,
      articles: item.articles,
      formattedTraffic: item.formattedTraffic,
      relatedQueries: item.relatedQueries,
    }));
  } catch (error) {
    return { error: error.message || 'Failed to fetch daily trends' };
  }
}

/**
 * Fetches real-time trending searches for a given country and category.
 * @param {string} [geo='US'] - Country code.
 * @param {string} [category='all'] - Category (e.g., 'all', 'b', 'e', 'm', 's', 't').
 * @returns {Promise<Array>} Array of real-time trending topics.
 */
async function getRealtimeTrends(geo = 'US', category = 'all') {
  try {
    const results = await googleTrends.realtimeTrends({ geo, category });
    const data = JSON.parse(results);
    return (data.storySummaries?.trendingStories || []).map(item => ({
      title: item.title,
      entityNames: item.entityNames,
      articles: item.articles,
    }));
  } catch (error) {
    return { error: error.message || 'Failed to fetch realtime trends' };
  }
}

/**
 * Fetches interest over time for a keyword.
 * @param {string} keyword - The keyword to search.
 * @param {string} [geo='US'] - Country code.
 * @returns {Promise<Object>} Interest over time data.
 */
async function getInterestOverTime(keyword, geo = 'US') {
  try {
    const results = await googleTrends.interestOverTime({ keyword, geo });
    return JSON.parse(results);
  } catch (error) {
    return { error: error.message || 'Failed to fetch interest over time' };
  }
}

// Class-based API used by TrendScraper
class GoogleTrendsScraper {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Search trend signals for a keyword including interest over time,
   * related queries and regional interest.
   */
  async searchTrends(keyword, timeframe = '7d', geo = 'US') {
    const [interestRaw, relatedRaw, regionRaw] = await Promise.all([
      googleTrends.interestOverTime({ keyword, geo, timeframe }),
      googleTrends.relatedQueries({ keyword, geo }),
      googleTrends.interestByRegion({ keyword, geo })
    ]);

    const interest = JSON.parse(interestRaw);
    const related = JSON.parse(relatedRaw);
    const region = JSON.parse(regionRaw);

    const interestOverTime = (interest.default?.timelineData || []).map(d => ({
      time: d.formattedTime || d.time,
      value: Array.isArray(d.value) ? Number(d.value[0] || 0) : Number(d.value || 0)
    }));

    const relatedQueries = (related.default?.rankedList?.[0]?.rankedKeyword || []).map(r => ({
      query: r.query,
      value: r.value
    }));

    const regionalInterest = (region.default?.geoMapData || []).map(r => ({
      geoName: r.geoName,
      value: Array.isArray(r.value) ? Number(r.value[0] || 0) : Number(r.value || 0)
    }));

    return {
      keyword,
      interestOverTime,
      relatedQueries,
      regionalInterest
    };
  }

  // Convenience instance wrappers used by TrendScraper fallbacks
  async getDailyTrends(geo = 'US') {
    return await getDailyTrends(geo);
  }

  async getRealtimeTrends(geo = 'US', category = 'all') {
    return await getRealtimeTrends(geo, category);
  }
}

module.exports = {
  // function exports kept for compatibility with tests and scripts
  getDailyTrends,
  getRealtimeTrends,
  getInterestOverTime,
  // class export for TrendScraper
  default: GoogleTrendsScraper,
  GoogleTrendsScraper
};
