// src/routes/asset.routes.js

const express = require('express');
const controller = require('../controllers/asset.controller');

const router = express.Router();

// List assets for current user
router.get('/', controller.list);

// Upload asset (expects `req.file` set by an upstream multer middleware)
router.post('/upload', controller.upload);

// Delete asset by id
router.delete('/:id', controller.remove);

module.exports = router;

