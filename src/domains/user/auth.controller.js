const authService = require('./auth.service');
const { success, error } = require('../../core/utils/response');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(success(user, 'User registered successfully', 201));
  } catch (err) { next(err); }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    res.json(success(data, 'Login successful'));
  } catch (err) { next(err); }
};

/**
 * GET /api/auth/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json(success(user));
  } catch (err) { next(err); }
};

module.exports = { register, login, getProfile };
