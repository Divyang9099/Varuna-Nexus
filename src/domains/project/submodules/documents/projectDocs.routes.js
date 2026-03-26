const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('./projectDocs.controller');
const upload = require('../../../../core/middleware/upload.middleware');

router.post('/', upload.single('file'), controller.uploadDocument);
router.get('/', controller.getDocuments);
router.put('/:docId', controller.updateDocument);
router.delete('/:docId', controller.deleteDocument);
router.get('/:docId/download', controller.downloadDocument);

module.exports = router;
