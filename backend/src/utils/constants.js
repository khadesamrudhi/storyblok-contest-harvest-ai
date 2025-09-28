// src/utils/constants.js

const SCRAPING_STATUS = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
});

module.exports = {
  SCRAPING_STATUS
};

