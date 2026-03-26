const express = require('express');
const router = express.Router();
const controller = require('./library.controller');
const upload = require('../../core/middleware/upload.middleware');
const authenticate = require('../../core/middleware/auth.middleware');

const authorize = require('../../core/middleware/role.middleware');

router.use(authenticate); // 🔐 All library routes require authentication

// categories
router.get('/categories', controller.getCategories);
router.post('/categories', authorize('admin', 'project_manager'), controller.createCategory);
router.put('/categories/:id', authorize('admin', 'project_manager'), controller.updateCategory);
router.delete('/categories/:id', authorize('admin', 'project_manager'), controller.deleteCategory);

// documents
router.get('/documents', controller.getDocuments);
router.post('/documents', authorize('admin', 'project_manager'), upload.single('file'), controller.createDocument);
router.put('/documents/:id', authorize('admin', 'project_manager'), controller.updateDocument);
router.delete('/documents/:id', authorize('admin', 'project_manager'), controller.deleteDocument);
router.get('/documents/:id/download', controller.downloadDocument);

// version history
router.get('/documents/:id/versions', controller.getVersions);
router.post('/documents/:id/versions', authorize('admin', 'project_manager'), upload.single('file'), controller.addVersion);

module.exports = router;
