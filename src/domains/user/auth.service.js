const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../../core/config/db');
const env    = require('../../core/config/env');

/**
 * Register a new user
 */
const register = async ({ name, email, password, role, phone }) => {
  // Check if user already exists
  const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows.length > 0) {
    throw Object.assign(new Error('User with this email already exists'), { statusCode: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, phone, created_at`,
    [name, email, password_hash, role, phone || null]
  );

  return result.rows[0];
};

/**
 * Login — validates credentials and returns JWT
 */
const login = async ({ email, password }) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

/**
 * Get current user profile from token payload
 */
const getProfile = async (userId) => {
  const result = await pool.query(
    'SELECT id, name, email, role, phone, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  return result.rows[0];
};

module.exports = { register, login, getProfile };
