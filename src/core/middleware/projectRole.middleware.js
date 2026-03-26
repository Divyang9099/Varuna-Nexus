const db = require('../config/db');
const { error } = require('../utils/response');

/**
 * Ensures the user has a specific role WITHIN the project context.
 * Admins are bypassed.
 * Usage: requireProjectRole('manager', 'admin')
 */
const requireProjectRole = (...allowedProjectRoles) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.id || req.params.projectId;
      const user = req.user;

      if (!projectId) {
        return res.status(400).json(error('Project context is required.', 400));
      }

      if (user.role === 'admin') {
        return next();
      }

      const result = await db.query(
        'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, user.id]
      );

      if (!result.rows.length) {
        return res.status(403).json(error('Access denied. You are not a member of this project.', 403));
      }

      const projectRole = result.rows[0].role;
      if (!allowedProjectRoles.includes(projectRole)) {
        return res.status(403).json(
          error(`Access denied. This operation requires project-level role: ${allowedProjectRoles.join(' or ')}`, 403)
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = requireProjectRole;
