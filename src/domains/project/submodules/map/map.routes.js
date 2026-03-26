const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('./map.controller');

const requireProjectRole = require('../../../../core/middleware/projectRole.middleware');

router.post('/', requireProjectRole('project_manager'), controller.saveMapData);
router.get('/', controller.getMapData);
router.delete('/', requireProjectRole('project_manager'), controller.deleteMapData);

module.exports = router;
