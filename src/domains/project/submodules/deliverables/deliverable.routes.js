const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('./deliverable.controller');
const upload = require('../../../../core/middleware/upload.middleware');

router.post('/', upload.single('file'), controller.createDeliverable);
router.get('/', controller.getDeliverables);
router.put('/:deliverableId', controller.updateDeliverable);
router.delete('/:deliverableId', controller.deleteDeliverable);
router.get('/:deliverableId/download', controller.downloadDeliverable);

const requireProjectRole = require('../../../../core/middleware/projectRole.middleware');

// Approve deliverable endpoint
router.put('/:deliverableId/approve', requireProjectRole('project_manager'), controller.approveDeliverable);

module.exports = router;
