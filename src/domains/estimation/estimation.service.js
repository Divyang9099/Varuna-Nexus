const db = require('../../core/config/db');

// CREATE
exports.createEstimation = async (data, cost, userId) => {
  // Validate project FK if provided
  if (data.project_id) {
    const proj = await db.query('SELECT id FROM projects WHERE id = $1', [data.project_id]);
    if (!proj.rows.length) {
      throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    }
  }

  // Store the raw inputs + the computed breakdown both in JSONB details
  const details = { inputs: data, breakdown: cost };

  const result = await db.query(
    `
    INSERT INTO estimations
    (project_id, client_name, project_type, total_cost, margin, tax, details, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
    `,
    [
      data.project_id || null,
      data.client_name || null,
      data.project_type || null,
      cost.total,
      cost.margin,
      cost.tax,
      JSON.stringify(details),
      userId,
    ]
  );

  return result.rows[0];
};

exports.getEstimations = async (user) => {
  if (user.role === 'admin') {
    const result = await db.query('SELECT * FROM estimations ORDER BY created_at DESC');
    return result.rows;
  }
  const result = await db.query(
    `SELECT e.* FROM estimations e
     WHERE e.project_id IN (
       SELECT project_id FROM project_members WHERE user_id = $1
     ) OR e.project_id IS NULL
     ORDER BY e.created_at DESC`,
    [user.id]
  );
  return result.rows;
};

// GET ONE
exports.getEstimationById = async (id) => {
  const result = await db.query('SELECT * FROM estimations WHERE id = $1', [id]);
  if (!result.rows.length) {
    throw Object.assign(new Error('Estimation not found'), { statusCode: 404 });
  }
  return result.rows[0];
};

// UPDATE
exports.updateEstimation = async (id, data, cost) => {
  const details = { inputs: data, breakdown: cost };

  const result = await db.query(
    `
    UPDATE estimations
    SET 
      total_cost = $1,
      margin     = $2,
      tax        = $3,
      details    = $4
    WHERE id = $5
    RETURNING *;
    `,
    [cost.total, cost.margin, cost.tax, JSON.stringify(details), id]
  );

  if (!result.rows.length) {
    throw Object.assign(new Error('Estimation not found'), { statusCode: 404 });
  }

  return result.rows[0];
};

// DELETE
exports.deleteEstimation = async (id) => {
  const result = await db.query('DELETE FROM estimations WHERE id = $1 RETURNING id', [id]);
  if (!result.rows.length) {
    throw Object.assign(new Error('Estimation not found'), { statusCode: 404 });
  }
};

// CLONE
exports.cloneEstimation = async (id, userId) => {
  const original = await exports.getEstimationById(id); // ✅ FIX: was `this.getEstimationById` — crashes in CommonJS

  const clone = await db.query(
    `
    INSERT INTO estimations
    (project_id, client_name, project_type, total_cost, margin, tax, details, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
    `,
    [
      original.project_id,
      original.client_name,
      original.project_type,
      original.total_cost,
      original.margin,
      original.tax,
      original.details,
      userId,
    ]
  );

  return clone.rows[0];
};
