const jwt    = require('jsonwebtoken');
const env    = require('../config/env');
const { error } = require('../utils/response');

/**
 * Protect routes — verifies JWT from Authorization header
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(error('Access denied. No token provided.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    if (!env.jwt.secret) {
        console.error('CRITICAL ERROR: JWT_SECRET is not configured in environment.');
        return res.status(500).json(error('Server authentication configuration error.', 500));
    }
    const decoded = jwt.verify(token, env.jwt.secret);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json(error('Invalid or expired token.', 401));
  }
};

module.exports = authenticate;
