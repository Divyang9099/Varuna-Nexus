const db = require('../../core/config/db');
const audit = require('../audit/audit.service');

exports.getDocuments = async (query) => {
  const conditions = ['1=1'];
  const values = [];

  if (query.category_id) {
    values.push(query.category_id);
    conditions.push(`d.category_id = $${values.length}`);
  }

  if (query.search) {
    values.push(`%${query.search}%`);
    conditions.push(`(d.name ILIKE $${values.length} OR d.description ILIKE $${values.length})`);
  }

  const result = await db.query(
    `SELECT d.*, c.name AS category_name, u.name AS uploaded_by_name
     FROM library_documents d
     LEFT JOIN library_categories c ON d.category_id = c.id
     LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY d.created_at DESC`,
    values
  );
  return result.rows;
};

exports.createDocument = async (data, userId) => {
  const result = await db.query(
    `INSERT INTO library_documents
     (category_id, name, description, file_name, file_key, version, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,'v1',$6)
     RETURNING *`,
    [
      data.category_id || null,
      data.name || null,
      data.description || null,
      data.file_name || null,
      data.file_key || null,
      userId,
    ]
  );

  const doc = result.rows[0];

  // Create the first version history entry
  await db.query(
    `INSERT INTO library_versions (document_id, file_key, version)
     VALUES ($1,$2,'v1')`,
    [doc.id, data.file_key || null]
  );

  // 📝 LOG AUDIT
  await audit.log({
    user_id: userId,
    action: 'UPLOAD_LIBRARY_DOC',
    entity_type: 'library_document',
    entity_id: doc.id,
    new_value: doc
  });

  return doc;
};

exports.updateDocument = async (id, data) => {
  // 1. Get existing to merge
  const check = await db.query('SELECT * FROM library_documents WHERE id = $1', [id]);
  if (!check.rows.length) throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  const existing = check.rows[0];

  // 2. Perform state-aware update
  const result = await db.query(
    `UPDATE library_documents
     SET 
       name = $1,
       description = $2,
       category_id = $3,
       file_key = $4,
       file_name = $5
     WHERE id = $6
     RETURNING *`,
    [
      data.name !== undefined ? data.name : existing.name,
      data.description !== undefined ? data.description : existing.description,
      data.category_id !== undefined ? data.category_id : existing.category_id,
      data.file_key !== undefined ? data.file_key : existing.file_key,
      data.file_name !== undefined ? data.file_name : existing.file_name,
      id
    ]
  );
  return result.rows[0];
};

exports.deleteDocument = async (id) => {
  const result = await db.query('DELETE FROM library_documents WHERE id=$1 RETURNING id', [id]);
  if (!result.rows.length) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
};
