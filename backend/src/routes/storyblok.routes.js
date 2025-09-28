// src/routes/storyblok.routes.js

const express = require('express');
const controller = require('../controllers/storyblok.controller');

const router = express.Router();

// CDN reads
router.get('/stories', controller.listStories);
router.get('/stories/:slug', controller.getStory);
router.get('/components', controller.getComponents);

// Management API writes (require management token + space id)
router.post('/stories', controller.createStory);
router.put('/stories/:id', controller.updateStory);
router.post('/stories/:id/publish', controller.publishStory);

// Webhook receiver
router.post('/webhook', controller.webhook);

module.exports = router;

