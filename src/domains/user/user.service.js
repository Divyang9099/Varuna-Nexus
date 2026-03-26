const pool = require('../../core/config/db');

/**
 * Get all users (admin only)
 */
const getAllUsers = async () => {
  const result = await pool.query(
    'SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
};

/**
 * Get single user by ID
 */
const getUserById = async (id) => {
  const result = await pool.query(
    'SELECT id, name, email, role, phone, created_at FROM users WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return result.rows[0];
};

/**
 * Update user
 */
const updateUser = async (id, { name, role, phone }) => {
  const result = await pool.query(
    `UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role), phone = COALESCE($3, phone)
     WHERE id = $4
     RETURNING id, name, email, role, phone, created_at`,
    [name, role, phone, id]
  );
  if (result.rows.length === 0) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return result.rows[0];
};

/**
 * Delete user
 */
const deleteUser = async (id) => {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return { deleted: true };
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser };
