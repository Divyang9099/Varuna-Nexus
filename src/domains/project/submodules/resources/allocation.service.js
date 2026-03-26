const db = require('../../../../core/config/db');
const audit = require('../../../audit/audit.service');

// CREATE
exports.createAllocation = async (projectId, data, userId) => {
  const { pilot_id, drone_id, start_date, end_date } = data;

  // Date validation
  if (!start_date || !end_date) {
    throw Object.assign(new Error('start_date and end_date are required'), { statusCode: 400 });
  }
  if (new Date(start_date) > new Date(end_date)) {
    throw Object.assign(new Error('Invalid date range (start_date cannot be after end_date)'), { statusCode: 400 });
  }

  // 1. Check project exists
  const project = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
  if (!project.rows.length) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }

  // 2. Check conflict (pilot)
  if (pilot_id) {
    const pilotConflict = await db.query(
      `SELECT id FROM allocations WHERE pilot_id = $1 AND (start_date <= $3 AND end_date >= $2)`,
      [pilot_id, start_date, end_date]
    );

    if (pilotConflict.rows.length > 0) {
      // 🚩 Log Conflict before throwing
      await db.query(
        `INSERT INTO allocation_conflicts (conflicting_allocation_id, conflict_type) VALUES ($1, 'pilot')`,
        [pilotConflict.rows[0].id]
      );
      throw Object.assign(new Error('Pilot already allocated in this time range'), { statusCode: 409 });
    }

    // ✅ NEW: Check status (active check)
    const pilotCheck = await db.query('SELECT status FROM pilots WHERE id = $1', [pilot_id]);
    if (!pilotCheck.rows.length) throw Object.assign(new Error('Pilot not found'), { statusCode: 404 });
    if (pilotCheck.rows[0].status !== 'active') {
      throw Object.assign(new Error(`Pilot is not active (status: ${pilotCheck.rows[0].status})`), { statusCode: 409 });
    }

    // ✅ NEW: Check calendar events (leave, training)
    const pilotEventConflict = await db.query(
      `SELECT id FROM calendar_events 
       WHERE resource_id = $1 AND resource_type = 'pilot'
       AND event_type IN ('leave', 'training')
       AND (start_date <= $3 AND end_date >= $2)`,
      [pilot_id, start_date, end_date]
    );
    if (pilotEventConflict.rows.length > 0) {
      throw Object.assign(new Error('Pilot has a conflicting calendar event (leave/training)'), { statusCode: 409 });
    }
  }

  // 3. Check conflict (drone)
  if (drone_id) {
    const droneConflict = await db.query(
      `SELECT id FROM allocations WHERE drone_id = $1 AND (start_date <= $3 AND end_date >= $2)`,
      [drone_id, start_date, end_date]
    );

    if (droneConflict.rows.length > 0) {
      // 🚩 Log Conflict before throwing
      await db.query(
        `INSERT INTO allocation_conflicts (conflicting_allocation_id, conflict_type) VALUES ($1, 'drone')`,
        [droneConflict.rows[0].id]
      );
      throw Object.assign(new Error('Drone already allocated in this time range'), { statusCode: 409 });
    }

    // ✅ NEW: Check status (active check)
    const droneCheck = await db.query('SELECT status FROM drones WHERE id = $1', [drone_id]);
    if (!droneCheck.rows.length) throw Object.assign(new Error('Drone not found'), { statusCode: 404 });
    if (droneCheck.rows[0].status !== 'active') {
      throw Object.assign(new Error(`Drone is not available (status: ${droneCheck.rows[0].status})`), { statusCode: 409 });
    }

    // ✅ NEW: Check calendar events (maintenance)
    const droneEventConflict = await db.query(
      `SELECT id FROM calendar_events 
       WHERE resource_id = $1 AND resource_type = 'drone'
       AND event_type = 'maintenance'
       AND (start_date <= $3 AND end_date >= $2)`,
      [drone_id, start_date, end_date]
    );
    if (droneEventConflict.rows.length > 0) {
      throw Object.assign(new Error('Drone has a conflicting maintenance block'), { statusCode: 409 });
    }
  }

  // Insert allocation
  const query = `
    INSERT INTO allocations
    (project_id, pilot_id, drone_id, start_date, end_date)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *;
  `;

  const values = [projectId, pilot_id || null, drone_id || null, start_date, end_date];
  const result = await db.query(query, values);
  const allocation = result.rows[0];

  // 📝 LOG AUDIT
  await audit.log({
    user_id: userId,
    action: 'ALLOCATE_RESOURCE',
    entity_type: 'allocation',
    entity_id: allocation.id,
    new_value: allocation
  });

  return allocation;
};

// GET
exports.getAllocations = async (projectId) => {
  const result = await db.query(
    `
    SELECT a.*, u.name AS pilot_name, d.name AS drone_name
    FROM allocations a
    LEFT JOIN pilots p ON a.pilot_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN drones d ON a.drone_id = d.id
    WHERE a.project_id = $1
    ORDER BY a.start_date ASC
    `,
    [projectId]
  );
  return result.rows;
};

// UPDATE
exports.updateAllocation = async (allocationId, data, userId) => {
  const { pilot_id, drone_id, start_date, end_date } = data;

  const existingResult = await db.query('SELECT * FROM allocations WHERE id = $1', [allocationId]);
  if (!existingResult.rows.length) {
    throw Object.assign(new Error('Allocation not found'), { statusCode: 404 });
  }
  const existing = existingResult.rows[0];

  const final_pilot = pilot_id !== undefined ? pilot_id : existing.pilot_id;
  const final_drone = drone_id !== undefined ? drone_id : existing.drone_id;
  const final_start = start_date !== undefined ? start_date : existing.start_date;
  const final_end = end_date !== undefined ? end_date : existing.end_date;

  if (!final_start || !final_end) {
    throw Object.assign(new Error('start_date and end_date cannot be null'), { statusCode: 400 });
  }

  if (new Date(final_start) > new Date(final_end)) {
    throw Object.assign(new Error('Invalid date range'), { statusCode: 400 });
  }

  // ✅ FIX: Re-check conflicts on update, excluding current allocation ID
  if (final_pilot) {
    const pilotConflict = await db.query(
      `SELECT id FROM allocations
       WHERE pilot_id = $1 AND id != $2
       AND (start_date <= $4 AND end_date >= $3)`,
      [final_pilot, allocationId, final_start, final_end]
    );
    if (pilotConflict.rows.length) {
      // 🚩 Log Conflict
      await db.query(
        `INSERT INTO allocation_conflicts (allocation_id, conflicting_allocation_id, conflict_type) VALUES ($1, $2, 'pilot')`,
        [allocationId, pilotConflict.rows[0].id]
      );
      throw Object.assign(new Error('Pilot already allocated in this time range'), { statusCode: 409 });
    }

    // ✅ NEW: Check status on update (if changed)
    const pilotCheck = await db.query('SELECT status FROM pilots WHERE id = $1', [final_pilot]);
    if (!pilotCheck.rows.length) throw Object.assign(new Error('Pilot not found'), { statusCode: 404 });
    if (pilotCheck.rows[0].status !== 'active') {
      throw Object.assign(new Error(`Pilot is not active (status: ${pilotCheck.rows[0].status})`), { statusCode: 409 });
    }

    // ✅ NEW: Check calendar events on update
    const pilotEventConflict = await db.query(
      `SELECT id FROM calendar_events 
       WHERE resource_id = $1 AND resource_type = 'pilot'
       AND event_type IN ('leave', 'training')
       AND (start_date <= $3 AND end_date >= $2)`,
      [final_pilot, final_start, final_end]
    );
    if (pilotEventConflict.rows.length > 0) {
      throw Object.assign(new Error('Pilot has a conflicting calendar event (leave/training)'), { statusCode: 409 });
    }
  }

  if (final_drone) {
    const droneConflict = await db.query(
      `SELECT id FROM allocations
       WHERE drone_id = $1 AND id != $2
       AND (start_date <= $4 AND end_date >= $3)`,
      [final_drone, allocationId, final_start, final_end]
    );
    if (droneConflict.rows.length) {
      // 🚩 Log Conflict
      await db.query(
        `INSERT INTO allocation_conflicts (allocation_id, conflicting_allocation_id, conflict_type) VALUES ($1, $2, 'drone')`,
        [allocationId, droneConflict.rows[0].id]
      );
      throw Object.assign(new Error('Drone already allocated in this time range'), { statusCode: 409 });
    }

    // ✅ NEW: Check status on update (if changed)
    const droneCheck = await db.query('SELECT status FROM drones WHERE id = $1', [final_drone]);
    if (!droneCheck.rows.length) throw Object.assign(new Error('Drone not found'), { statusCode: 404 });
    if (droneCheck.rows[0].status !== 'active') {
      throw Object.assign(new Error(`Drone is not available (status: ${droneCheck.rows[0].status})`), { statusCode: 409 });
    }

    // ✅ NEW: Check calendar events on update
    const droneEventConflict = await db.query(
      `SELECT id FROM calendar_events 
       WHERE resource_id = $1 AND resource_type = 'drone'
       AND event_type = 'maintenance'
       AND (start_date <= $3 AND end_date >= $2)`,
      [final_drone, final_start, final_end]
    );
    if (droneEventConflict.rows.length > 0) {
      throw Object.assign(new Error('Drone has a conflicting maintenance block'), { statusCode: 409 });
    }
  }

  const query = `
    UPDATE allocations
    SET
      pilot_id   = $1,
      drone_id   = $2,
      start_date = $3,
      end_date   = $4
    WHERE id = $5
    RETURNING *;
  `;

  const values = [final_pilot, final_drone, final_start, final_end, allocationId];
  const result = await db.query(query, values);
  if (!result.rows.length) {
    throw Object.assign(new Error('Allocation not found'), { statusCode: 404 });
  }
  const updated = result.rows[0];

  // 📝 LOG AUDIT
  await audit.log({
    user_id: userId,
    action: 'UPDATE_ALLOCATION',
    entity_type: 'allocation',
    entity_id: allocationId,
    old_value: existing,
    new_value: updated
  });

  return updated;
};

// DELETE
exports.deleteAllocation = async (allocationId, userId) => {
  // 1. Get existing first for audit
  const existing = await db.query('SELECT * FROM allocations WHERE id = $1', [allocationId]);
  if (!existing.rows.length) {
    throw Object.assign(new Error('Allocation not found'), { statusCode: 404 });
  }

  const result = await db.query('DELETE FROM allocations WHERE id = $1 RETURNING id', [allocationId]);
  
  // 📝 LOG AUDIT
  await audit.log({
    user_id: userId,
    action: 'DELETE_ALLOCATION',
    entity_type: 'allocation',
    entity_id: allocationId,
    old_value: existing.rows[0]
  });
};
