const express      = require('express');
const router       = express.Router();
const controller   = require('./project.controller');
const authenticate = require('../../core/middleware/auth.middleware');
const requireProjectAccess = require('../../core/middleware/projectAccess.middleware');

const scopeRoutes       = require('./submodules/scope/scope.routes');
const allocationRoutes  = require('./submodules/resources/allocation.routes');
const docRoutes         = require('./submodules/documents/projectDocs.routes');
const deliverableRoutes = require('./submodules/deliverables/deliverable.routes');
const mapRoutes         = require('./submodules/map/map.routes');
const memberRoutes      = require('./submodules/members/member.routes');

const { createProjectSchema, updateProjectSchema } = require('./project.validation');
const validate = require('../../core/middleware/validate.middleware');

router.use(authenticate); // 🔐 All project routes require authentication

router.post('/', validate(createProjectSchema), controller.createProject);
router.get('/', controller.getProjects);

// 👇 The middleware intercepts anything with :id globally
router.use('/:id([0-9a-fA-F-]{36})', requireProjectAccess);

router.get('/:id([0-9a-fA-F-]{36})', controller.getProjectById);
router.put('/:id([0-9a-fA-F-]{36})', validate(updateProjectSchema), controller.updateProject);

// mount submodules
router.use('/:id([0-9a-fA-F-]{36})/scope', scopeRoutes);
router.use('/:id([0-9a-fA-F-]{36})/resources', allocationRoutes);
router.use('/:id([0-9a-fA-F-]{36})/documents', docRoutes);
router.use('/:id([0-9a-fA-F-]{36})/deliverables', deliverableRoutes);
router.use('/:id([0-9a-fA-F-]{36})/map', mapRoutes);
router.use('/:id([0-9a-fA-F-]{36})/members', memberRoutes);

module.exports = router;
