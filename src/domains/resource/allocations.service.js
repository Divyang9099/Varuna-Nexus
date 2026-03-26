const db = require('../../core/config/db');

/**
 * Global view of ALL allocations across all projects
 * Shows who/what is deployed where, with optional filters
 */
exports.getGlobalAllocations = async (filters = {}) => {
  const { status, pilot_id, drone_id } = filters;

  let conditions = ['1=1'];
  let values = [];
  let idx = 1;

  if (status) {
    conditions.push(`p.status = $${idx++}`);
    values.push(status);
  }
  if (pilot_id) {
    conditions.push(`a.pilot_id = $${idx++}`);
    values.push(pilot_id);
  }
  if (drone_id) {
    conditions.push(`a.drone_id = $${idx++}`);
    values.push(drone_id);
  }

  const result = await db.query(
    `SELECT
       a.id             AS allocation_id,
       a.start_date,
       a.end_date,
       a.is_pipeline,
       p.id             AS project_id,
       p.name           AS project_name,
       p.status         AS project_status,
       p.state          AS project_state,
       u.id             AS pilot_user_id,
       u.name           AS pilot_name,
       u.email          AS pilot_email,
       pi.id            AS pilot_id,
       pi.license_number,
       pi.status        AS pilot_status,
       d.id             AS drone_id,
       d.name           AS drone_name,
       d.model          AS drone_model,
       d.status         AS drone_status
     FROM allocations a
     JOIN projects p ON a.project_id = p.id
     LEFT JOIN pilots pi ON a.pilot_id = pi.id
     LEFT JOIN users u ON pi.user_id = u.id
     LEFT JOIN drones d ON a.drone_id = d.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY a.start_date DESC`,
    values
  );

  return result.rows;
};
