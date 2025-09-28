// testMetadataScraper.js
const { scrapeMetadata } = require('./MetadataScraper');

(async () => {
  const url = 'https://github.com/khadesamrudhi'; // Change to any URL you want to test
  const metadata = await scrapeMetadata(url);
  console.log(metadata);
})();
