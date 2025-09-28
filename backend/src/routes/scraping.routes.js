// src/routes/scraping.routes.js

const express = require('express');
const controller = require('../controllers/scraping.controller');

const router = express.Router();

// Enqueue a new scraping job
router.post('/enqueue', controller.enqueue);

// Job status
router.get('/:id/status', controller.status);

// Remove a job
router.delete('/:id', controller.remove);

// Queue stats
router.get('/stats', controller.stats);

// Pause/resume queue
router.post('/pause', controller.pause);
router.post('/resume', controller.resume);

module.exports = router;

