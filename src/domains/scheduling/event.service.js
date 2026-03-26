const db = require('../../core/config/db');

exports.createEvent = async (data) => {
  const query = `
    INSERT INTO calendar_events
    (title, event_type, resource_type, resource_id, start_date, end_date, location, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *;
  `;

  // Provide NULL where optional
  const values = [
    data.title || null,
    data.event_type || null,
    data.resource_type || 'all',
    data.resource_id || null,
    data.start_date || null,
    data.end_date || null,
    data.location || null,
    data.notes || null,
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

exports.getEvents = async () => {
  const result = await db.query('SELECT * FROM calendar_events ORDER BY start_date ASC');
  return result.rows;
};

exports.updateEvent = async (id, data) => {
  const query = `
    UPDATE calendar_events
    SET 
      title = COALESCE($1, title),
      start_date = COALESCE($2, start_date),
      end_date = COALESCE($3, end_date),
      location = COALESCE($4, location),
      notes = COALESCE($5, notes)
    WHERE id = $6
    RETURNING *;
  `;

  const values = [
    data.title !== undefined ? data.title : null, 
    data.start_date !== undefined ? data.start_date : null, 
    data.end_date !== undefined ? data.end_date : null, 
    data.location !== undefined ? data.location : null, 
    data.notes !== undefined ? data.notes : null,
    id
  ];

  const result = await db.query(query, values);
  if (!result.rows.length) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }

  return result.rows[0];
};

exports.deleteEvent = async (id) => {
  const result = await db.query('DELETE FROM calendar_events WHERE id=$1 RETURNING id', [id]);
  if (!result.rows.length) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }
};
