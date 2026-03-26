const express = require('express');
const router = express.Router();

const controller = require('./calendar.controller');
const authenticate = require('../../core/middleware/auth.middleware');

router.use(authenticate); // 🔐 Secure calendar

// calendar view
router.get('/', controller.getCalendar);

// events
router.get('/events', controller.getEvents);
router.post('/events', controller.createEvent);
router.put('/events/:id', controller.updateEvent);
router.delete('/events/:id', controller.deleteEvent);

// conflicts
router.get('/conflicts', controller.getConflicts);
router.put('/conflicts/:id/resolve', controller.resolveConflict);

module.exports = router;
