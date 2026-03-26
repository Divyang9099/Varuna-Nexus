const router = require('express').Router();
const userCtrl = require('./user.controller');
const authenticate = require('../../core/middleware/auth.middleware');
const authorize    = require('../../core/middleware/role.middleware');

// All user routes require authentication
router.use(authenticate);

// Admin-only routes
router.get('/',       authorize('admin'), userCtrl.getAll);
router.get('/:id',    authorize('admin', 'project_manager'), userCtrl.getById);
router.put('/:id',    authorize('admin'), userCtrl.update);
router.delete('/:id', authorize('admin'), userCtrl.remove);

module.exports = router;
