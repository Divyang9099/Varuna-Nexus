const db = require('../../../../core/config/db');
const audit = require('../../../audit/audit.service');

// CREATE
exports.createDeliverable = async (projectId, data) => {
  const { name, format, file_key, uploaded_by, file_name } = data;

  // 1. Check project exists
  const project = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
  if (!project.rows.length) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }

  // ✅ Lifecycle: Start as 'pending' unless file is provided immediately
  const status = file_key ? 'uploaded' : 'pending';
  const uploaded_at = file_key ? 'CURRENT_TIMESTAMP' : null;

  const query = `
    INSERT INTO deliverables
    (project_id, name, format, file_key, uploaded_by, status, uploaded_at)
    VALUES ($1, $2, $3, $4, $5, $6, ${uploaded_at === 'CURRENT_TIMESTAMP' ? 'CURRENT_TIMESTAMP' : 'NULL'})
    RETURNING *;
  `;

  const values = [projectId, name || file_name || null, format || null, file_key || null, uploaded_by || null, status];
  
  const result = await db.query(query, values);
  const deliverable = result.rows[0];

  // 📝 LOG AUDIT
  await audit.log({
    user_id: uploaded_by,
    action: 'UPLOAD_DELIVERABLE',
    entity_type: 'deliverable',
    entity_id: deliverable.id,
    new_value: deliverable
  });

  return deliverable;
};

// GET
exports.getDeliverables = async (projectId) => {
  const result = await db.query(
    `
    SELECT d.*, u.name as uploaded_by_name
    FROM deliverables d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE project_id = $1
    ORDER BY uploaded_at DESC
    `,
    [projectId]
  );

  return result.rows;
};

// UPDATE (Name, Format, URL)
exports.updateDeliverable = async (projectId, id, data) => {
  const { name, format, file_key } = data;
  // ✅ Lifecycle: Move from 'pending' to 'uploaded' when file is attached
  const existing = await db.query('SELECT status, file_key FROM deliverables WHERE id = $1', [id]);
  if (!existing.rows.length) throw Object.assign(new Error('Deliverable not found'), { statusCode: 404 });
  
  let statusUpdate = '';
  if (file_key && existing.rows[0].status === 'pending') {
    statusUpdate = ", status = 'uploaded', uploaded_at = CURRENT_TIMESTAMP";
  }

  const query = `
    UPDATE deliverables
    SET 
      name = COALESCE($1, name), 
      format = COALESCE($2, format), 
      file_key = COALESCE($3, file_key)
      ${statusUpdate}
    WHERE id = $4 AND project_id = $5
    RETURNING *;
  `;

  const values = [name || null, format || null, file_key || null, id, projectId];
  const result = await db.query(query, values);

  if (!result.rows.length) {
    throw Object.assign(new Error('Deliverable not found'), { statusCode: 404 });
  }

  return result.rows[0];
};

// DELETE
exports.deleteDeliverable = async (projectId, id) => {
  const result = await db.query('DELETE FROM deliverables WHERE id = $1 AND project_id = $2 RETURNING id', [id, projectId]);
  
  if (!result.rows.length) {
    throw Object.assign(new Error('Deliverable not found'), { statusCode: 404 });
  }
};

// APPROVE
exports.approveDeliverable = async (projectId, id, userId) => {
  // 1. Check if it exists and is already approved
  const check = await db.query('SELECT status FROM deliverables WHERE id = $1 AND project_id = $2', [id, projectId]);
  if (!check.rows.length) {
    throw Object.assign(new Error('Deliverable not found'), { statusCode: 404 });
  }

  if (check.rows[0].status === 'approved') {
    throw Object.assign(new Error('Deliverable is already approved'), { statusCode: 409 });
  }

  const query = `
    UPDATE deliverables
    SET status = 'approved'
    WHERE id = $1 AND project_id = $2
    RETURNING *;
  `;

  const result = await db.query(query, [id, projectId]);
  const deliverable = result.rows[0];

  // 📝 LOG AUDIT
  await audit.log({
    user_id: userId,
    action: 'APPROVE_DELIVERABLE',
    entity_type: 'deliverable',
    entity_id: deliverable.id,
    new_value: { status: 'approved' }
  });

  return deliverable;
};
