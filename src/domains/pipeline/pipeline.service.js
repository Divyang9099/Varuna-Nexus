const db = require('../../core/config/db');
const audit = require('../audit/audit.service');

// CREATE
exports.createPipeline = async (data, userId) => {
  if (data.win_probability !== undefined && (data.win_probability < 0 || data.win_probability > 100)) {
    throw Object.assign(new Error('win_probability must be between 0 and 100'), { statusCode: 400 });
  }

  // 1. Prevent manually setting 'converted' during creation
  if (data.stage === 'converted') {
    throw Object.assign(new Error("Cannot manually set stage to 'converted'. Initial stage must be a valid pipeline stage."), { statusCode: 400 });
  }
  const query = `
    INSERT INTO pipeline
    (name, client_name, project_type, stage, estimated_value, win_probability,
     state, latitude, longitude, tentative_scope, notes,
     tentative_pilot, tentative_drone,
     estimated_start, estimated_end)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING *;
  `;

  const values = [
    data.name || null,
    data.client_name || null,
    data.project_type || null,
    data.stage || 'enquiry',
    data.estimated_value || null,
    data.win_probability || null,
    data.state || null,
    data.latitude || null,
    data.longitude || null,
    data.tentative_scope || null,
    data.notes || null,
    data.tentative_pilot || null,
    data.tentative_drone || null,
    data.estimated_start || null,
    data.estimated_end || null,
  ];

  const result = await db.query(query, values);
  const pipeline = result.rows[0];

  // 📝 LOG AUDIT
  await audit.log({
    user_id: userId,
    action: 'CREATE_PIPELINE',
    entity_type: 'pipeline',
    entity_id: pipeline.id,
    new_value: pipeline
  });

  return pipeline;
};

// GET ALL (Active Only)
exports.getPipelines = async () => {
  const result = await db.query(
    "SELECT * FROM pipeline WHERE converted_project_id IS NULL AND stage != 'lost' ORDER BY created_at DESC"
  );
  return result.rows;
};

// GET CALENDAR VIEW (Active Pipeline Dates)
exports.getCalendarView = async (query) => {
  let dateFilter = '1=1';
  const values = [];

  if (query.start && query.end) {
    values.push(query.start, query.end);
    dateFilter = `(estimated_start <= $2 AND estimated_end >= $1)`;
  }

  const result = await db.query(
    `SELECT id, name AS title, estimated_start AS start, estimated_end AS end, stage, tentative_pilot, tentative_drone, state
     FROM pipeline
     WHERE converted_project_id IS NULL AND estimated_start IS NOT NULL 
     AND stage NOT IN ('lost', 'converted')
     AND ${dateFilter}
     ORDER BY estimated_start ASC`,
    values
  );
  return result.rows;
};

// GET ONE
exports.getPipelineById = async (id) => {
  const result = await db.query('SELECT * FROM pipeline WHERE id = $1', [id]);
  if (!result.rows.length) {
    throw Object.assign(new Error('Pipeline record not found'), { statusCode: 404 });
  }
  return result.rows[0];
};

// UPDATE
exports.updatePipeline = async (id, data, userId) => {
  if (data.win_probability !== undefined && (data.win_probability < 0 || data.win_probability > 100)) {
    throw Object.assign(new Error('win_probability must be between 0 and 100'), { statusCode: 400 });
  }

  // 1. Get existing record to merge
  const existingRes = await db.query('SELECT * FROM pipeline WHERE id = $1', [id]);
  if (!existingRes.rows.length) {
    throw Object.assign(new Error('Pipeline record not found'), { statusCode: 404 });
  }
  const existing = existingRes.rows[0];

  // 2. Prevent updating converted records
  if (existing.converted_project_id) {
    throw Object.assign(new Error('Cannot update a converted pipeline record'), { statusCode: 409 });
  }

  const query = `
    UPDATE pipeline
    SET 
      name = $1, 
      client_name = $2, 
      project_type = $3,
      estimated_value = $4, 
      win_probability = $5,
      state = $6, 
      latitude = $7, 
      longitude = $8,
      tentative_scope = $9,
      notes = $10,
      tentative_pilot = $11, 
      tentative_drone = $12,
      estimated_start = $13, 
      estimated_end = $14
    WHERE id = $15
    RETURNING *;
  `;

  const values = [
    data.name !== undefined ? data.name : existing.name,
    data.client_name !== undefined ? data.client_name : existing.client_name,
    data.project_type !== undefined ? data.project_type : existing.project_type,
    data.estimated_value !== undefined ? data.estimated_value : existing.estimated_value,
    data.win_probability !== undefined ? data.win_probability : existing.win_probability,
    data.state !== undefined ? data.state : existing.state,
    data.latitude !== undefined ? data.latitude : existing.latitude,
    data.longitude !== undefined ? data.longitude : existing.longitude,
    data.tentative_scope !== undefined ? data.tentative_scope : existing.tentative_scope,
    data.notes !== undefined ? data.notes : existing.notes,
    data.tentative_pilot !== undefined ? data.tentative_pilot : existing.tentative_pilot,
    data.tentative_drone !== undefined ? data.tentative_drone : existing.tentative_drone,
    data.estimated_start !== undefined ? data.estimated_start : existing.estimated_start,
    data.estimated_end !== undefined ? data.estimated_end : existing.estimated_end,
    id,
  ];

  const result = await db.query(query, values);
  const updated = result.rows[0];

  // 📝 LOG AUDIT
  await audit.log({
    user_id: userId,
    action: 'UPDATE_PIPELINE',
    entity_type: 'pipeline',
    entity_id: id,
    old_value: existing,
    new_value: updated
  });

  return updated;
};

// DELETE
exports.deletePipeline = async (id) => {
  const result = await db.query('DELETE FROM pipeline WHERE id=$1 RETURNING id', [id]);
  if (!result.rows.length) {
    throw Object.assign(new Error('Pipeline record not found'), { statusCode: 404 });
  }
};

// UPDATE STAGE
exports.updateStage = async (id, stage, userId) => {
  if (stage === 'converted') {
    throw Object.assign(new Error("Cannot manually set stage to 'converted'. Use the conversion API instead."), { statusCode: 400 });
  }
  const validStages = ['enquiry', 'proposal', 'negotiation', 'verbal_confirmation', 'lost'];
  if (!validStages.includes(stage)) {
    throw Object.assign(new Error('Invalid pipeline stage'), { statusCode: 400 });
  }

  // ✅ Prevent manually reverting a converted record
  const current = await db.query('SELECT stage, converted_project_id FROM pipeline WHERE id=$1', [id]);
  if (!current.rows.length) throw Object.assign(new Error('Pipeline record not found'), { statusCode: 404 });
  if (current.rows[0].converted_project_id) {
    throw Object.assign(new Error('Cannot change stage of a converted pipeline record'), { statusCode: 409 });
  }

  const result = await db.query(
    'UPDATE pipeline SET stage=$1 WHERE id=$2 RETURNING *',
    [stage, id]
  );
  
  const pipeline = result.rows[0];

  // 📝 LOG AUDIT
  await audit.log({
    user_id: userId,
    action: 'UPDATE_PIPELINE_STAGE',
    entity_type: 'pipeline',
    entity_id: id,
    old_value: { stage: current.rows[0].stage },
    new_value: { stage: pipeline.stage }
  });

  return pipeline;
};
