// src/routes/trend.routes.js

const express = require('express');
const controller = require('../controllers/trend.controller');
const validate = require('../middleware/validation.middleware');
const { analyzeTrends, pagination } = require('../utils/validators');

const router = express.Router();

// Analyze trends with optional save=true to persist top trends
router.post('/analyze', analyzeTrends, validate, controller.analyze);

// Latest trends
router.get('/latest', pagination, validate, controller.latest);

// Trends by category
router.get('/category/:category', pagination, validate, controller.byCategory);

module.exports = router;

