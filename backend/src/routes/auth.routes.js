// src/routes/auth.routes.js

const express = require('express');
const { body } = require('express-validator');
const auth = require('../controllers/auth.controller');
const validation = require('../middleware/validation.middleware');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').optional().trim().isLength({ max: 100 })
  ],
  validation,
  auth.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  validation,
  auth.login
);

// GET /api/auth/me (protected)
router.get('/me', authMiddleware, auth.me);

// PATCH /api/auth/profile (protected)
router.patch(
  '/profile',
  authMiddleware,
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 chars')
  ],
  validation,
  auth.updateProfile
);

// PATCH /api/auth/password (protected)
router.patch(
  '/password',
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  validation,
  auth.changePassword
);

module.exports = router;

