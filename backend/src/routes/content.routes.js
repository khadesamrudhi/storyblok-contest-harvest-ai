// src/routes/content.routes.js

const express = require('express');
const controller = require('../controllers/content.controller');

const router = express.Router();

// List user content
router.get('/', controller.list);

// Create content
router.post('/', controller.create);

// Analyze content (basic analyzer + predictor)
router.post('/analyze', controller.analyze);

// Generate content and metadata
router.post('/generate', controller.generate);

module.exports = router;

