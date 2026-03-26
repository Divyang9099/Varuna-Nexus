const db = require('../../core/config/db');
const audit = require('../audit/audit.service');

exports.createProject = async (data, userId) => {
  const query = `
    INSERT INTO projects
    (
      name, client_name, project_type, status, start_date, end_date,
      state, district, latitude, longitude, description,
      po_number, work_order_number, contact_person, kml_file_url, created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING *;
  `;

  const values = [
    data.name,
    data.client_name,
    data.project_type,
    data.status || 'enquiry',
    data.start_date || null,
    data.end_date || null,
    data.state || null,
    data.district || null,
    data.latitude || null,
    data.longitude || null,
    data.description || null,
    data.po_number || null,
    data.work_order_number || null,
    data.contact_person || null,
    data.kml_file_url || null,
    userId
  ];

  const result = await db.query(query, values);
  const project = result.rows[0];

  // 📝 LOG AUDIT
  await audit.log({
    user_id: userId,
    action: 'CREATE_PROJECT',
    entity_type: 'project',
    entity_id: project.id,
    new_value: project
  });

  return project;
};

exports.getProjects = async (user) => {
  if (user && user.role !== 'admin') {
    const result = await db.query(
      `SELECT p.* FROM projects p
       INNER JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [user.id]
    );
    return result.rows;
  }
  
  const result = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
  return result.rows;
};

exports.getProjectById = async (id) => {
  const result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
  return result.rows[0];
};

exports.updateProject = async (id, data, userId) => {
  // 1. Get existing record to merge
  const existing = await exports.getProjectById(id);
  if (!existing) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }

  const query = `
    UPDATE projects
    SET 
      name = $1,
      client_name = $2,
      project_type = $3,
      status = $4,
      start_date = $5,
      end_date = $6,
      description = $7,
      state = $8,
      district = $9,
      latitude = $10,
      longitude = $11,
      kml_file_url = $12,
      po_number = $13,
      work_order_number = $14,
      contact_person = $15
    WHERE id = $16
    RETURNING *;
  `;

  const values = [
    data.name !== undefined ? data.name : existing.name,
    data.client_name !== undefined ? data.client_name : existing.client_name,
    data.project_type !== undefined ? data.project_type : existing.project_type,
    data.status !== undefined ? data.status : existing.status,
    data.start_date !== undefined ? data.start_date : existing.start_date,
    data.end_date !== undefined ? data.end_date : existing.end_date,
    data.description !== undefined ? data.description : existing.description,
    data.state !== undefined ? data.state : existing.state,
    data.district !== undefined ? data.district : existing.district,
    data.latitude !== undefined ? data.latitude : existing.latitude,
    data.longitude !== undefined ? data.longitude : existing.longitude,
    data.kml_file_url !== undefined ? data.kml_file_url : existing.kml_file_url,
    data.po_number !== undefined ? data.po_number : existing.po_number,
    data.work_order_number !== undefined ? data.work_order_number : existing.work_order_number,
    data.contact_person !== undefined ? data.contact_person : existing.contact_person,
    id
  ];

  const result = await db.query(query, values);
  const project = result.rows[0];

  // 📝 LOG AUDIT
  await audit.log({
    user_id: userId,
    action: 'UPDATE_PROJECT',
    entity_type: 'project',
    entity_id: project.id,
    new_value: project
  });

  return project;
};

