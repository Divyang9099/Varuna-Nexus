const express = require('express');
const router = express.Router();
const controller = require('./notification.controller');
const authenticate = require('../../core/middleware/auth.middleware');

// All notification routes require authentication
router.use(authenticate);

router.get('/', controller.getNotifications);
router.put('/read-all', controller.markAllRead);
router.put('/:id/read', controller.markAsRead);
router.delete('/:id', controller.deleteNotification);

module.exports = router;
