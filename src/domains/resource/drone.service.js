const db = require('../../core/config/db');

exports.createDrone = async (data) => {
  const result = await db.query(
    `INSERT INTO drones (name, model, serial_number, status, sensor_type, uin)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      data.name, 
      data.model, 
      data.serial_number, 
      data.status || 'active', 
      data.sensor_type || null, 
      data.uin || null
    ]
  );
  return result.rows[0];
};

exports.getDrones = async () => {
  const result = await db.query('SELECT * FROM drones ORDER BY id DESC');
  return result.rows;
};

exports.getDroneById = async (id) => {
  const result = await db.query('SELECT * FROM drones WHERE id = $1', [id]);
  if (!result.rows.length) throw Object.assign(new Error('Drone not found'), { statusCode: 404 });
  return result.rows[0];
};

exports.updateDrone = async (id, data) => {
  const result = await db.query(
    `UPDATE drones 
     SET name = COALESCE($1, name),
         model = COALESCE($2, model),
         serial_number = COALESCE($3, serial_number),
         status = COALESCE($4, status),
         sensor_type = COALESCE($5, sensor_type),
         uin = COALESCE($6, uin)
     WHERE id = $7 RETURNING *`,
    [
      data.name !== undefined ? data.name : null, 
      data.model !== undefined ? data.model : null, 
      data.serial_number !== undefined ? data.serial_number : null, 
      data.status !== undefined ? data.status : null, 
      data.sensor_type !== undefined ? data.sensor_type : null, 
      data.uin !== undefined ? data.uin : null,
      id
    ]
  );
  if (!result.rows.length) throw Object.assign(new Error('Drone not found'), { statusCode: 404 });
  return result.rows[0];
};

exports.deleteDrone = async (id) => {
  // 🚩 FK GUARD: Check allocations
  const allocs = await db.query('SELECT COUNT(*) FROM allocations WHERE drone_id = $1', [id]);
  if (parseInt(allocs.rows[0].count) > 0) {
    throw Object.assign(new Error('Cannot delete drone: Active project allocations exist'), { statusCode: 409 });
  }

  // Check maintenance
  const maintenance = await db.query('SELECT COUNT(*) FROM drone_maintenance_logs WHERE drone_id = $1', [id]);
  if (parseInt(maintenance.rows[0].count) > 0) {
    throw Object.assign(new Error('Cannot delete drone: Historical maintenance records exist. Archiving recommended.'), { statusCode: 409 });
  }

  const result = await db.query('DELETE FROM drones WHERE id = $1 RETURNING id', [id]);
  if (!result.rows.length) throw Object.assign(new Error('Drone not found'), { statusCode: 404 });
};

