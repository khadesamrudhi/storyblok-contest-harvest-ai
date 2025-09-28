// src/middleware/auth.middleware.js

const jwt = require('jsonwebtoken');
const { supabaseClient } = require('../integrations/storage/SupabaseClient');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided or invalid format' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const user = await supabaseClient.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token - user not found' });
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    return next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

module.exports = authMiddleware;