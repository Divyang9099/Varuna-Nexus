const service         = require('./library.service');
const categoryService = require('./category.service');
const versionService  = require('./version.service');
const { success, error } = require('../../core/utils/response');
const { uploadToR2 } = require('../../core/utils/r2Upload');
const { getFileStream } = require('../../core/utils/r2Download');
const db = require('../../core/config/db');

// ─── CATEGORIES ──────────────────────────────

exports.getCategories = async (req, res, next) => {
  try {
    res.json(success(await categoryService.getCategories()));
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    res.status(201).json(success(await categoryService.createCategory(req.body), 'Category created', 201));
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    res.json(success(await categoryService.updateCategory(req.params.id, req.body), 'Category updated'));
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    res.json(success(null, 'Category deleted'));
  } catch (err) { next(err); }
};

// ─── DOCUMENTS ───────────────────────────────

exports.getDocuments = async (req, res, next) => {
  try {
    res.json(success(await service.getDocuments(req.query)));
  } catch (err) { next(err); }
};

exports.createDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json(error('No file provided', 400));
    const key = await uploadToR2(req.file, "library");

    const data = await service.createDocument({
      ...req.body,
      file_name: req.file.originalname,
      file_key: key
    }, req.user.id);
    res.status(201).json(success(data, 'Document uploaded', 201));
  } catch (err) { next(err); }
};

exports.updateDocument = async (req, res, next) => {
  try {
    res.json(success(await service.updateDocument(req.params.id, req.body), 'Document updated'));
  } catch (err) { next(err); }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    await service.deleteDocument(req.params.id);
    res.json(success(null, 'Document deleted'));
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/library/documents/:id/download
 */
exports.downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const dResult = await db.query('SELECT * FROM library_documents WHERE id = $1', [id]);
    if (!dResult.rows.length) {
      return res.status(404).json(error('Document not found', 404));
    }
    const doc = dResult.rows[0];

    // Log download action
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
       VALUES ($1, 'DOWNLOAD', 'library_document', $2)`,
      [req.user.id, doc.id]
    );

    const r2Key = doc.file_key;
    if (!r2Key) {
      return res.status(404).json(error('File not found — upload may have failed', 404));
    }

    const stream = await getFileStream(r2Key);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name || doc.name || 'document'}"`);
    
    stream.on('error', (streamErr) => {
      console.error('R2 Stream Error (Library):', streamErr.message);
      if (!res.headersSent) {
        next(streamErr);
      } else {
        res.destroy();
      }
    }).pipe(res);
  } catch (err) { next(err); }
};

// ─── VERSIONS ────────────────────────────────

exports.getVersions = async (req, res, next) => {
  try {
    res.json(success(await versionService.getVersions(req.params.id)));
  } catch (err) { next(err); }
};

exports.addVersion = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json(error('No file provided for version', 400));
    const key = await uploadToR2(req.file, "library");

    const data = await versionService.addVersion(req.params.id, {
      ...req.body,
      file_key: key
    });
    res.status(201).json(success(data, 'New version added', 201));
  } catch (err) { next(err); }
};
