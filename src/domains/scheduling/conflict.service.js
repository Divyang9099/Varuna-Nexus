const db = require('../../core/config/db');

exports.getConflicts = async () => {
  const result = await db.query('SELECT * FROM allocation_conflicts WHERE resolved = false ORDER BY created_at DESC');
  return result.rows;
};

exports.resolveConflict = async (id) => {
  const result = await db.query(
    'UPDATE allocation_conflicts SET resolved = true WHERE id = $1 RETURNING *',
    [id]
  );
  
  if (!result.rows.length) {
    throw Object.assign(new Error('Conflict not found'), { statusCode: 404 });
  }
  
  return result.rows[0];
};
