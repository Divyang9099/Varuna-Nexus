const { error } = require('../utils/response');

/**
 * Role-based access control middleware
 * Usage: authorize('admin', 'project_manager')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(error('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(
        error(`Access denied. Required role: ${allowedRoles.join(' or ')}`, 403)
      );
    }

    next();
  };
};

module.exports = authorize;
