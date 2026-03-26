const db = require('../../../../core/config/db');

// UPLOAD DOCUMENT
exports.uploadDocument = async (projectId, data) => {
  const { file_name, file_key, category, uploaded_by } = data;

  // 1. Check project exists
  const project = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
  if (!project.rows.length) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }

  // 2. Version control logic
  const existing = await db.query(
    `
    SELECT version FROM project_documents
    WHERE project_id = $1 AND LOWER(file_name) = LOWER($2)
    ORDER BY (substring(version FROM '[0-9]+'))::INT DESC
    LIMIT 1
    `,
    [projectId, file_name]
  );

  let version = 'v1';

  if (existing.rows.length > 0) {
    const lastVersion = (existing.rows[0].version || '').toString();
    const match = lastVersion.match(/\d+/);
    const num = (match ? parseInt(match[0], 10) : 1) + 1;
    version = `v${num}`;
  }

  // 3. Insert Document
  const query = `
    INSERT INTO project_documents
    (project_id, file_name, file_key, category, version, uploaded_by)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *;
  `;

  const values = [
    projectId,
    file_name,
    file_key,
    category || null,
    version,
    uploaded_by || null,
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

// GET DOCUMENTS
exports.getDocuments = async (projectId) => {
  const result = await db.query(
    `
    SELECT d.*, u.name as uploaded_by_name
    FROM project_documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE project_id = $1
    ORDER BY created_at DESC
    `,
    [projectId]
  );

  return result.rows;
};

// UPDATE DOCUMENT (metadata only)
exports.updateDocument = async (docId, data) => {
  const { category, file_name } = data;

  const query = `
    UPDATE project_documents
    SET 
      category = COALESCE($1, category), 
      file_name = COALESCE($2, file_name)
    WHERE id = $3
    RETURNING *;
  `;

  const values = [category || null, file_name || null, docId];

  const result = await db.query(query, values);

  if (!result.rows.length) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }

  return result.rows[0];
};

// DELETE DOCUMENT
exports.deleteDocument = async (docId) => {
  const result = await db.query('DELETE FROM project_documents WHERE id=$1 RETURNING id', [docId]);
  
  if (!result.rows.length) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
};
