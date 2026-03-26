const db = require('../../core/config/db');

exports.createPilot = async (data) => {
  // 1. Verify user exists
  const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [data.user_id]);
  if (!userCheck.rows.length) {
    throw Object.assign(new Error('Cannot create pilot: User not found'), { statusCode: 404 });
  }

  // 2. Insert pilot profile
  const result = await db.query(
    `INSERT INTO pilots (user_id, license_number, status, base_location, certification)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      data.user_id, 
      data.license_number, 
      data.status || 'active', 
      data.base_location || null,
      data.certification || null
    ]
  );
  return result.rows[0];
};

exports.getPilots = async () => {
  const result = await db.query(
    `SELECT p.*, u.name, u.email, u.phone 
     FROM pilots p 
     JOIN users u ON p.user_id = u.id 
     ORDER BY p.id DESC`
  );
  return result.rows;
};

exports.getPilotById = async (id) => {
  const result = await db.query(
    `SELECT p.*, u.name, u.email, u.phone 
     FROM pilots p 
     JOIN users u ON p.user_id = u.id 
     WHERE p.id = $1`,
    [id]
  );
  if (!result.rows.length) throw Object.assign(new Error('Pilot not found'), { statusCode: 404 });
  return result.rows[0];
};

exports.updatePilot = async (id, data) => {
  // 1. Get existing record to merge
  const check = await db.query('SELECT * FROM pilots WHERE id = $1', [id]);
  if (!check.rows.length) throw Object.assign(new Error('Pilot not found'), { statusCode: 404 });
  const existing = check.rows[0];

  // 2. Perform state-aware update
  const result = await db.query(
    `UPDATE pilots 
     SET license_number = $1,
         status = $2,
         base_location = $3,
         certification = $4
     WHERE id = $5 RETURNING *`,
    [
      data.license_number !== undefined ? data.license_number : existing.license_number,
      data.status !== undefined ? data.status : existing.status,
      data.base_location !== undefined ? data.base_location : existing.base_location,
      data.certification !== undefined ? data.certification : existing.certification,
      id
    ]
  );
  return result.rows[0];
};

exports.deletePilot = async (id) => {
  // 🚩 FK GUARD: Prevent deletion if pilot has active allocations
  const count = await db.query('SELECT COUNT(*) FROM allocations WHERE pilot_id = $1', [id]);
  if (parseInt(count.rows[0].count) > 0) {
    throw Object.assign(
      new Error('Cannot delete pilot: Active project allocations exist. Deallocate first.'),
      { statusCode: 409 }
    );
  }

  const result = await db.query('DELETE FROM pilots WHERE id = $1 RETURNING id', [id]);
  if (!result.rows.length) throw Object.assign(new Error('Pilot not found'), { statusCode: 404 });
};

