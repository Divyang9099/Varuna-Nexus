const service = require('./deliverable.service');
const { success, error } = require('../../../../core/utils/response');
const { uploadToR2 } = require('../../../../core/utils/r2Upload');
const { getFileStream } = require('../../../../core/utils/r2Download');
const db = require('../../../../core/config/db');

exports.createDeliverable = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    if (!req.file) return res.status(400).json(error('No file provided', 400));
    const key = await uploadToR2(req.file, "deliverables");

    const data = await service.createDeliverable(projectId, {
      ...req.body,
      file_name: req.file.originalname,
      file_key: key,
      uploaded_by: req.user.id
    });
    res.status(201).json(success(data, 'Deliverable created', 201));
  } catch (err) { next(err); }
};

exports.getDeliverables = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const data = await service.getDeliverables(projectId);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

exports.updateDeliverable = async (req, res, next) => {
  try {
    const { deliverableId, id: projectId } = req.params;
    const data = await service.updateDeliverable(projectId, deliverableId, req.body);
    res.json(success(data, 'Deliverable updated'));
  } catch (err) {
    next(err);
  }
};

exports.deleteDeliverable = async (req, res, next) => {
  try {
    const { deliverableId, id: projectId } = req.params;
    await service.deleteDeliverable(projectId, deliverableId);
    res.json(success(null, 'Deliverable deleted'));
  } catch (err) {
    next(err);
  }
};

exports.approveDeliverable = async (req, res, next) => {
  try {
    const { deliverableId, id: projectId } = req.params;
    const data = await service.approveDeliverable(projectId, deliverableId, req.user.id);
    res.json(success(data, 'Deliverable approved'));
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/projects/:id/deliverables/:id/download
 * Secure stream download for finalized deliverables.
 */
exports.downloadDeliverable = async (req, res, next) => {
  try {
    const { deliverableId, id: projectId } = req.params;
    const requestingUser = req.user;

    // 1. Admin bypass check
    if (requestingUser.role !== 'admin') {
      const membership = await db.query(
        'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, requestingUser.id]
      );
      if (!membership.rows.length) {
        return res.status(403).json(error('Access denied. You are not a member of this project.', 403));
      }
    }

    // 2. Fetch deliverable
    const dResult = await db.query(
      'SELECT * FROM deliverables WHERE id = $1 AND project_id = $2',
      [deliverableId, projectId]
    );
    if (!dResult.rows.length) {
      return res.status(404).json(error('Deliverable not found', 404));
    }
    const doc = dResult.rows[0];

    // 3. Log download
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
       VALUES ($1, 'DOWNLOAD', 'deliverable', $2)`,
      [requestingUser.id, doc.id]
    );

    // 4. Stream from R2
    const r2Key = doc.file_key;
    if (!r2Key) {
      return res.status(404).json(error('File not found — upload may have failed', 404));
    }

    const stream = await getFileStream(r2Key);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name || 'deliverable'}"`);
    
    stream.on('error', (streamErr) => {
      console.error('R2 Stream Error (Deliverable):', streamErr.message);
      if (!res.headersSent) {
        next(streamErr);
      } else {
        res.destroy();
      }
    }).pipe(res);
  } catch (err) { next(err); }
};
