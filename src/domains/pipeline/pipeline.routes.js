const express      = require('express');
const router       = express.Router();
const controller   = require('./pipeline.controller');
const authenticate = require('../../core/middleware/auth.middleware');

router.use(authenticate); // 🔐 All pipeline routes require authentication
const authorize    = require('../../core/middleware/role.middleware');

router.use(authorize('admin', 'project_manager')); // 🚫 Pilots cannot manage pipelines

router.post('/', controller.createPipeline);
router.get('/', controller.getPipelines);
router.get('/calendar-view', controller.getCalendarView);
router.get('/:id', controller.getPipelineById);
router.put('/:id', controller.updatePipeline); // 🚩 Note: 'stage' field is ignored here. Use PUT /:id/stage to update status.
router.delete('/:id', controller.deletePipeline);

// stage update
router.put('/:id/stage', controller.updateStage);

// convert to project
router.post('/:id/convert', controller.convertToProject);

module.exports = router;
