const db = require('../../../../core/config/db');

// CREATE
exports.createScope = async (projectId, data) => {
  // 1. Validate project exists
  const project = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
  if (!project.rows.length) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }

  // 2. Prevent duplicate scope
  const existing = await db.query('SELECT * FROM project_scope WHERE project_id = $1', [projectId]);
  if (existing.rows.length > 0) {
    throw Object.assign(new Error('Scope already exists for this project'), { statusCode: 409 });
  }

  const query = `
    INSERT INTO project_scope
    (project_id, scope_type, area_hectares, length_km, asset_count, deliverables_expected, special_instructions)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  // Provide defaults or null for missing fields
  const values = [
    projectId,
    data.scope_type || null,
    data.area_hectares || null,
    data.length_km || null,
    data.asset_count || null,
    data.deliverables_expected ? JSON.stringify(data.deliverables_expected) : null,
    data.special_instructions || null,
  ];

  const result = await db.query(query, values);
  if (!result.rows.length) {
    throw Object.assign(new Error('Failed to create scope'), { statusCode: 500 });
  }
  return result.rows[0];
};

// GET
exports.getScope = async (projectId) => {
  const result = await db.query('SELECT * FROM project_scope WHERE project_id = $1', [projectId]);
  if (!result.rows.length) {
    return null;
  }
  return result.rows[0];
};

exports.updateScope = async (projectId, data) => {
  // 1. Load existing record to merge
  const existing = await exports.getScope(projectId);

  const query = `
    UPDATE project_scope
    SET
      scope_type = $1,
      area_hectares = $2,
      length_km = $3,
      asset_count = $4,
      deliverables_expected = $5,
      special_instructions = $6
    WHERE project_id = $7
    RETURNING *;
  `;

  const values = [
    data.scope_type !== undefined ? data.scope_type : existing.scope_type,
    data.area_hectares !== undefined ? data.area_hectares : existing.area_hectares,
    data.length_km !== undefined ? data.length_km : existing.length_km,
    data.asset_count !== undefined ? data.asset_count : existing.asset_count,
    data.deliverables_expected !== undefined ? (data.deliverables_expected ? JSON.stringify(data.deliverables_expected) : null) : existing.deliverables_expected,
    data.special_instructions !== undefined ? data.special_instructions : existing.special_instructions,
    projectId,
  ];

  const result = await db.query(query, values);
  if (!result.rows.length) {
    throw Object.assign(new Error('Scope not found for this project'), { statusCode: 404 });
  }
  return result.rows[0];
};
