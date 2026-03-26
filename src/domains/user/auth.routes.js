const router = require('express').Router();
const authCtrl = require('./auth.controller');
const { validateRegister, validateLogin } = require('./auth.validation');
const authenticate = require('../../core/middleware/auth.middleware');
const passwordService = require('./password.service');
const { success } = require('../../core/utils/response');

const rateLimit = require('express-rate-limit');

// 🛡️ SECURITY: Brute-force protection for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' }
});

// Public routes
router.post('/register', authLimiter, validateRegister, authCtrl.register);
router.post('/login',    authLimiter, validateLogin,    authCtrl.login);

// Password reset (public — no auth required, token-gated)
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const data = await passwordService.forgotPassword(req.body.email);
    res.json(success(null, data.message));
  } catch (err) { next(err); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    const data = await passwordService.resetPassword(token, new_password);
    res.json(success(null, data.message));
  } catch (err) { next(err); }
});

// Protected route
router.get('/profile', authenticate, authCtrl.getProfile);

module.exports = router;

