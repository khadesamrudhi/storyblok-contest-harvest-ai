// src/routes/ai.routes.js

const express = require('express');
const controller = require('../controllers/ai.controller');

const router = express.Router();

// Content analysis and generation
router.post('/analyze/content', controller.analyzeContent);
router.post('/generate/content', controller.generateContent);
router.post('/generate/metadata', controller.generateMetadata);
router.post('/suggest', controller.suggest);

// Image analysis
router.post('/analyze/image', controller.analyzeImage);

// Trend and competitor analysis
router.post('/analyze/trends', controller.analyzeTrends);
router.post('/analyze/competitor', controller.analyzeCompetitor);

module.exports = router;

