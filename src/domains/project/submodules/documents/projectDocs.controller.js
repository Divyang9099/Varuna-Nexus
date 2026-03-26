const service = require('./projectDocs.service');
const { success, error } = require('../../../../core/utils/response');
const db = require('../../../../core/config/db');
const { uploadToR2 } = require('../../../../core/utils/r2Upload');
const { getFileStream } = require('../../../../core/utils/r2Download');

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json(error('No file provided', 400));
    const key = await uploadToR2(req.file, "documents");

    const data = await service.uploadDocument(req.params.id, {
      ...req.body,
      file_name: req.file.originalname,
      file_key: key,
      uploaded_by: req.user.id
    });
    res.status(201).json(success(data, 'Document uploaded securely', 201));
  } catch (err) { next(err); }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const data = await service.getDocuments(req.params.id);
    res.json(success(data));
  } catch (err) { next(err); }
};

exports.updateDocument = async (req, res, next) => {
  try {
    const data = await service.updateDocument(req.params.docId, req.body);
    res.json(success(data, 'Document updated'));
  } catch (err) { next(err); }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    await service.deleteDocument(req.params.docId);
    res.json(success(null, 'Document deleted'));
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/projects/:id/documents/:docId/download
 * Secure file download — checks JWT + project membership before serving file URL.
 * Admins bypass membership check. Pilots/PMs must be assigned to the project.
 */
exports.downloadDocument = async (req, res, next) => {
  try {
    const { id: projectId, docId } = req.params;
    const requestingUser = req.user;

    // 1. Admin bypasses membership check
    if (requestingUser.role !== 'admin') {
      const membership = await db.query(
        'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, requestingUser.id]
      );
      if (!membership.rows.length) {
        return res.status(403).json(error('Access denied. You are not a member of this project.', 403));
      }
    }

    // 2. Fetch the document record
    const docResult = await db.query(
      'SELECT * FROM project_documents WHERE id = $1 AND project_id = $2',
      [docId, projectId]
    );
    if (!docResult.rows.length) {
      return res.status(404).json(error('Document not found', 404));
    }

    const doc = docResult.rows[0];

    // 3. Log the download in audit log
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
       VALUES ($1, 'DOWNLOAD', 'project_document', $2)`,
      [requestingUser.id, docId]
    );

    // 4. Stream from R2
    const r2Key = doc.file_key;
    if (!r2Key) {
      return res.status(404).json(error('File not found — upload may have failed', 404));
    }

    const stream = await getFileStream(r2Key);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    
    stream.on('error', (streamErr) => {
      console.error('R2 Stream Error:', streamErr.message);
      if (!res.headersSent) {
        next(streamErr);
      } else {
        res.destroy();
      }
    }).pipe(res);
  } catch (err) { next(err); }
};

