const db = require('../../core/config/db');
const audit = require('../audit/audit.service');

exports.convertToProject = async (pipelineId, userId) => {
  // 1. Get pipeline
  const pipelineResult = await db.query('SELECT * FROM pipeline WHERE id = $1', [pipelineId]);

  if (!pipelineResult.rows.length) {
    throw Object.assign(new Error('Pipeline not found'), { statusCode: 404 });
  }

  const p = pipelineResult.rows[0];

  if (p.converted_project_id) {
    throw Object.assign(new Error('Pipeline already converted to a Project'), { statusCode: 409 });
  }

  // Use a transaction since we are creating a project + allocation + updating pipeline
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 2. Create project
    const projectResult = await client.query(
      `
      INSERT INTO projects
      (name, client_name, project_type, status, state, latitude, longitude, description, start_date, end_date, created_by, source_pipeline_id)
      VALUES ($1, $2, $3, 'confirmed', $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
      `,
      [
        p.name,
        p.client_name,
        p.project_type,
        p.state,
        p.latitude,
        p.longitude,
        p.notes || p.tentative_scope, // Map pipeline context into project description
        p.estimated_start,
        p.estimated_end,
        userId,
        pipelineId
      ]
    );

    const project = projectResult.rows[0];

    // 3. Create allocation (tentative → confirmed)
    if ((p.tentative_pilot || p.tentative_drone) && p.estimated_start && p.estimated_end) {
      await client.query(
        `
        INSERT INTO allocations
        (project_id, pilot_id, drone_id, start_date, end_date, is_pipeline)
        VALUES ($1, $2, $3, $4, $5, false)
        `,
        [
          project.id,
          p.tentative_pilot,
          p.tentative_drone,
          p.estimated_start, // Ensure start mapping
          p.estimated_end    // Ensure end mapping
        ]
      );
    }

    // 4. Link back pipeline to project and lock it out of active funnel
    await client.query(
      'UPDATE pipeline SET converted_project_id=$1, stage=$2 WHERE id=$3',
      [project.id, 'converted', pipelineId]  // ✅ FIX: terminal state, exits enquiry/proposal funnel
    );

    // 📝 LOG AUDIT
    await audit.log({
      user_id: userId,
      action: 'CONVERT_PIPELINE',
      entity_type: 'pipeline',
      entity_id: pipelineId,
      new_value: { project_id: project.id },
      connection: client
    });

    await audit.log({
      user_id: userId,
      action: 'CREATE_PROJECT',
      entity_type: 'project',
      entity_id: project.id,
      new_value: project,
      connection: client
    });

    await client.query('COMMIT');
    return project;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
