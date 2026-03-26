const db = require('../../core/config/db');

exports.getVersions = async (docId) => {
  const result = await db.query(
    'SELECT * FROM library_versions WHERE document_id=$1 ORDER BY created_at DESC',
    [docId]
  );
  return result.rows;
};

exports.addVersion = async (docId, data) => {
  // Check if document exists
  const docCheck = await db.query('SELECT id FROM library_documents WHERE id=$1', [docId]);
  if (!docCheck.rows.length) throw Object.assign(new Error('Document not found'), { statusCode: 404 });

  // Get latest version number for this document
  const latest = await db.query(
    "SELECT version FROM library_versions WHERE document_id=$1 ORDER BY (substring(version FROM '[0-9]+'))::INT DESC LIMIT 1",
    [docId]
  );

  let version = 'v1';
  if (latest.rows.length > 0) {
    const lastVersion = (latest.rows[0].version || '').toString();
    const match = lastVersion.match(/\d+/);
    const num = (match ? parseInt(match[0], 10) : 1) + 1;
    version = `v${num}`;
  }

  // Insert new version row
  const result = await db.query(
    `INSERT INTO library_versions (document_id, file_key, version)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [docId, data.file_key || null, version]
  );

  // Update the parent document to reflect the latest version
  await db.query(
    'UPDATE library_documents SET version=$1 WHERE id=$2',
    [version, docId]
  );

  return result.rows[0];
};
