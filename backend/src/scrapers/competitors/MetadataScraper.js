// MetadataScraper.js
// Scrapes metadata (title, description, keywords, og tags, etc.) from a given URL

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetches and parses metadata from a given URL.
 * @param {string} url - The URL to scrape.
 * @returns {Promise<Object>} Metadata object with title, description, keywords, og, twitter, etc.
 */
async function scrapeMetadata(url) {
  try {
    const { data: html } = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(html);

    const getMeta = (name) =>
      $(`meta[name='${name}']`).attr('content') ||
      $(`meta[property='${name}']`).attr('content') || '';

    const metadata = {
      title: $('title').text() || getMeta('og:title'),
      description: getMeta('description') || getMeta('og:description'),
      keywords: getMeta('keywords'),
      og: {
        title: getMeta('og:title'),
        description: getMeta('og:description'),
        image: getMeta('og:image'),
        url: getMeta('og:url'),
        type: getMeta('og:type'),
        site_name: getMeta('og:site_name'),
      },
      twitter: {
        card: getMeta('twitter:card'),
        title: getMeta('twitter:title'),
        description: getMeta('twitter:description'),
        image: getMeta('twitter:image'),
        site: getMeta('twitter:site'),
      },
      canonical: $("link[rel='canonical']").attr('href') || '',
      favicon: $("link[rel='icon']").attr('href') || '',
    };

    return metadata;
  } catch (error) {
    return { error: error.message || 'Failed to fetch metadata' };
  }
}

module.exports = { scrapeMetadata };
