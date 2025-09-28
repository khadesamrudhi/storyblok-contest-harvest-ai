// src/routes/competitor.routes.js

const express = require('express');
const controller = require('../controllers/competitor.basic.controller');

const router = express.Router();

// List competitors for current user
router.get('/', controller.list);

// Create competitor
router.post('/', controller.create);

// Update competitor
router.patch('/:id', controller.update);

// Delete competitor
router.delete('/:id', controller.remove);

// Analyze competitor payload (AI)
router.post('/analyze', controller.analyze);

module.exports = router;

