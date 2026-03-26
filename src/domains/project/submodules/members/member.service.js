const db = require('../../../../core/config/db');

// ADD MEMBER TO PROJECT
exports.addMember = async (projectId, data) => {
  const { user_id, role } = data;

  if (!user_id) throw Object.assign(new Error('user_id is required'), { statusCode: 400 });

  // Check project exists
  const proj = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
  if (!proj.rows.length) throw Object.assign(new Error('Project not found'), { statusCode: 404 });

  // Check user exists
  const user = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [user_id]);
  if (!user.rows.length) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  // Prevent duplicate membership
  const exists = await db.query(
    'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, user_id]
  );
  if (exists.rows.length) throw Object.assign(new Error('User is already a member of this project'), { statusCode: 409 });

  const result = await db.query(
    `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) RETURNING *`,
    [projectId, user_id, role || user.rows[0].role]
  );

  return { ...result.rows[0], user: user.rows[0] };
};

// GET ALL MEMBERS OF A PROJECT
exports.getMembers = async (projectId) => {
  const proj = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
  if (!proj.rows.length) throw Object.assign(new Error('Project not found'), { statusCode: 404 });

  const result = await db.query(
    `SELECT pm.id, pm.role, pm.project_id,
            u.id as user_id, u.name, u.email, u.role as system_role, u.phone
     FROM project_members pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = $1
     ORDER BY u.name ASC`,
    [projectId]
  );
  return result.rows;
};

// REMOVE MEMBER FROM PROJECT
exports.removeMember = async (projectId, userId) => {
  const result = await db.query(
    'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING id',
    [projectId, userId]
  );
  if (!result.rows.length) throw Object.assign(new Error('Member not found in this project'), { statusCode: 404 });
};
