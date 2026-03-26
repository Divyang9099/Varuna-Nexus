const express = require('express');
const router = express.Router();
const controller = require('./dashboard.controller');
const authenticate = require('../../core/middleware/auth.middleware');

router.use(authenticate); // 🔐 Secure dashboard

router.get('/summary',     controller.getSummary);
router.get('/projects',    controller.getProjects);
router.get('/project/:id', controller.getProjectDetails);
router.get('/activity',    controller.getActivity);
router.get('/utilization', controller.getUtilization);
router.get('/upcoming',    controller.getUpcoming);

module.exports = router;
