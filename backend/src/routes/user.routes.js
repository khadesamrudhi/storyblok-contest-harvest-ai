// src/routes/user.routes.js

const express = require('express');
const controller = require('../controllers/user.controller');

const router = express.Router();

router.get('/me', controller.me);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.patch('/:id', controller.update);

module.exports = router;

