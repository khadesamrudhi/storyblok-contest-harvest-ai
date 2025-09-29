// src/routes/insights.routes.js

const express = require('express');
const controller = require('../controllers/ai.controller');

const router = express.Router();

// Predict content performance and return analysis + prediction
router.post('/predict', controller.analyzeContent);

// Summarize or generate insights from content (maps to suggest for now)
router.post('/summarize', controller.suggest);

module.exports = router;


