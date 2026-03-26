const db = require('../../core/config/db');

// SUMMARY
exports.getSummary = async (user) => {
  let projectFilter = '';
  let queryValues = [];
  
  if (user && user.role !== 'admin') {
    projectFilter = `WHERE id IN (SELECT project_id FROM project_members WHERE user_id = $1)`;
    queryValues.push(user.id);
  }

  const projects = await db.query(`
    SELECT 
      COUNT(*)                                              AS total,
      COUNT(*) FILTER (WHERE status = 'enquiry')           AS enquiry,
      COUNT(*) FILTER (WHERE status = 'confirmed')         AS confirmed,
      COUNT(*) FILTER (WHERE status = 'in_progress')       AS in_progress,
      COUNT(*) FILTER (WHERE status = 'post_processing')   AS post_processing,
      COUNT(*) FILTER (WHERE status = 'delivered')         AS delivered,
      COUNT(*) FILTER (WHERE status = 'on_hold')           AS on_hold,
      COUNT(*) FILTER (WHERE status = 'cancelled')         AS cancelled,
      COUNT(*) FILTER (
        WHERE end_date < CURRENT_DATE
        AND status NOT IN ('delivered', 'cancelled')
      )                                                    AS overdue
    FROM projects
    ${projectFilter}
  `, queryValues);

  const pipeline = await db.query(`
    SELECT
      COUNT(*)                                              AS total,
      COUNT(*) FILTER (WHERE stage = 'enquiry')            AS enquiry,
      COUNT(*) FILTER (WHERE stage = 'proposal')           AS proposal,
      COUNT(*) FILTER (WHERE stage = 'negotiation')        AS negotiation,
      COUNT(*) FILTER (WHERE stage = 'verbal_confirmation') AS verbal_confirmation,
      COALESCE(SUM(estimated_value), 0)                    AS total_estimated_value
    FROM pipeline
    WHERE converted_project_id IS NULL AND stage != 'lost'
  `);

  return {
    projects: projects.rows[0],
    pipeline:  pipeline.rows[0],
  };
};

// PROJECT LIST (FILTERED + SAFE PARAMETERIZED)
exports.getProjects = async (query, user) => {
  const conditions = ['1=1'];
  const values     = [];

  if (user && user.role !== 'admin') {
    values.push(user.id);
    conditions.push(`id IN (SELECT project_id FROM project_members WHERE user_id = $${values.length})`);
  }

  if (query.status) {
    values.push(query.status);
    conditions.push(`status = $${values.length}`);
  }

  if (query.type) {
    values.push(query.type);
    conditions.push(`project_type = $${values.length}`);
  }

  if (query.state) {
    values.push(query.state);
    conditions.push(`state = $${values.length}`);
  }

  let limit = query.limit ? parseInt(query.limit) : 25; // Default to 25
  let offset = query.offset ? parseInt(query.offset) : 0;

  // 🛡️ SECURITY: Enforce bounds on limit
  if (isNaN(limit) || limit <= 0) limit = 25;
  if (limit > 100) limit = 100; // Hard cap at 100 for safety
  if (isNaN(offset) || offset < 0) offset = 0;

  values.push(limit, offset);

  const sql = `
    SELECT * FROM projects
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `;

  const result = await db.query(sql, values);
  return result.rows;
};

// SINGLE PROJECT SUMMARY FOR DASHBOARD
exports.getProjectDetails = async (projectId) => {
  const result = await db.query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM allocations a WHERE a.project_id = p.id) as total_allocations,
            (SELECT COUNT(*) FROM project_documents d WHERE d.project_id = p.id) as total_documents,
            (SELECT COUNT(*) FROM deliverables del WHERE del.project_id = p.id) as total_deliverables
     FROM projects p
     WHERE p.id = $1`,
    [projectId]
  );
  if (!result.rows.length) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }
  return result.rows[0];
};

// RECENT ACTIVITY
exports.getActivity = async () => {
  const result = await db.query(`
    SELECT a.*, u.name AS user_name
    FROM activity_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.action NOT IN ('DOWNLOAD')
    ORDER BY a.created_at DESC
    LIMIT 15
  `);
  return result.rows;
};

// RESOURCE UTILIZATION
exports.getUtilization = async () => {
  const result = await db.query(`
    SELECT 
      pl.id                       AS pilot_id,
      u.name                      AS pilot_name,
      COUNT(a.id)                 AS total_allocations,
      COALESCE(SUM(a.end_date - a.start_date), 0) AS total_days_allocated
    FROM pilots pl
    LEFT JOIN users u ON pl.user_id = u.id
    LEFT JOIN allocations a ON pl.id = a.pilot_id
    GROUP BY pl.id, u.name
    ORDER BY total_allocations DESC
  `);

  return result.rows;
};

// UPCOMING PROJECTS (next 30 days)
exports.getUpcoming = async (user) => {
  let projectFilter = '1=1';
  let queryValues = [];

  if (user && user.role !== 'admin') {
    queryValues.push(user.id);
    projectFilter = `id IN (SELECT project_id FROM project_members WHERE user_id = $1)`;
  }

  const result = await db.query(`
    SELECT * FROM projects
    WHERE start_date >= CURRENT_DATE
      AND start_date <= CURRENT_DATE + INTERVAL '30 days'
      AND ${projectFilter}
    ORDER BY start_date ASC
    LIMIT 10
  `, queryValues);
  return result.rows;
};
