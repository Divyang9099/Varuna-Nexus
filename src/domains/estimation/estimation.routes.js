const express = require('express');
const router = express.Router();
const controller = require('./estimation.controller');
const itemsController = require('./estimation.items.controller');
const authenticate = require('../../core/middleware/auth.middleware');

router.use(authenticate); // 🔐 Secure estimations
const authorize    = require('../../core/middleware/role.middleware');

router.use(authorize('admin', 'project_manager')); // 🚫 Pilots cannot manage estimates

router.post('/', controller.createEstimation);
router.get('/', controller.getEstimations);
router.get('/:id', controller.getEstimationById);
router.put('/:id', controller.updateEstimation);
router.delete('/:id', controller.deleteEstimation);

router.post('/:id/clone', controller.cloneEstimation);
router.get('/:id/export/excel', controller.exportExcel);
router.get('/:id/export/pdf', controller.exportPDF);

// ── Estimation Line Items ─────────────────────
router.post('/:id/items', itemsController.addItem);
router.get('/:id/items', itemsController.getItems);
router.put('/:id/items/:itemId', itemsController.updateItem);
router.delete('/:id/items/:itemId', itemsController.deleteItem);

module.exports = router;

