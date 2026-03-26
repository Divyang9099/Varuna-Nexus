const db = require('../config/db');
const { error } = require('../utils/response');

/**
 * Ensures the requesting user has access to a specific project.
 * Admins bypass this automatically.
 * Project Managers and Pilots must be listed in `project_members`.
 */
const requireProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    if (!projectId) {
        return res.status(400).json(error('Project context is required for this operation.', 400));
    }

    const user = req.user;
    if (!user) return res.status(401).json(error('Authentication required', 401));

    // Admin has universal access
    if (user.role === 'admin') {
      return next();
    }

    // Check project_members table
    const result = await db.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, user.id]
    );

    if (!result.rows.length) {
      return res.status(403).json(error('Access denied. You are not a member of this project.', 403));
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireProjectAccess;
