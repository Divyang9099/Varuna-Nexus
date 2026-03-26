const express = require('express');
const router = express.Router();

const pilotController = require('./pilot.controller');
const droneController = require('./drone.controller');
const authenticate = require('../../core/middleware/auth.middleware');
const { success } = require('../../core/utils/response');
const allocationsService = require('./allocations.service');
const maintenanceService  = require('./maintenance.service');

const authorize = require('../../core/middleware/role.middleware');

router.use(authenticate); // Require authentication to interact with resources

// ─── GLOBAL ALLOCATIONS VIEW ─────────────────
router.get('/allocations', async (req, res, next) => {
  try {
    const data = await allocationsService.getGlobalAllocations(req.query);
    res.json(success(data));
  } catch (err) { next(err); }
});

// ─── PILOTS ──────────────────────────────────
router.post('/pilots', authorize('admin'), pilotController.createPilot);
router.get('/pilots', pilotController.getPilots);
router.get('/pilots/:id', pilotController.getPilotById);
router.put('/pilots/:id', authorize('admin'), pilotController.updatePilot);
router.delete('/pilots/:id', authorize('admin'), pilotController.deletePilot);

// ─── DRONES ──────────────────────────────────
router.post('/drones', authorize('admin'), droneController.createDrone);
router.get('/drones', droneController.getDrones);
router.get('/drones/:id', droneController.getDroneById);
router.put('/drones/:id', authorize('admin'), droneController.updateDrone);
router.delete('/drones/:id', authorize('admin'), droneController.deleteDrone);

// ─── DRONE MAINTENANCE LOGS ──────────────────
router.post('/drones/:id/maintenance', authorize('admin', 'project_manager'), async (req, res, next) => {
  try {
    const data = await maintenanceService.logMaintenance(req.params.id, req.body);
    res.status(201).json(success(data, 'Maintenance logged', 201));
  } catch (err) { next(err); }
});

router.get('/drones/:id/maintenance', async (req, res, next) => {
  try {
    const data = await maintenanceService.getMaintenanceLogs(req.params.id);
    res.json(success(data));
  } catch (err) { next(err); }
});

module.exports = router;

