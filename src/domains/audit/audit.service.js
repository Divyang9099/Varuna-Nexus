const db = require('../../core/config/db');

/**
 * Append-only audit logger — immutable record of every system action.
 * Called internally by services after mutations.
 */
exports.log = async ({ user_id, action, entity_type, entity_id, old_value = null, new_value = null, connection = null }) => {
  const conn = connection || db;
  await conn.query(
    `
    INSERT INTO activity_logs
    (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      user_id || null,
      action,
      entity_type || null,
      entity_id || null,
      old_value ? JSON.stringify(old_value) : null,
      new_value ? JSON.stringify(new_value) : null,
    ]
  );
};

/**
 * Retrieve audit logs — admin only, filterable by entity and action.
 */
exports.getLogs = async ({ entity_type, entity_id, action, limit = 50 } = {}) => {
  const conditions = ['1=1'];
  const values = [];

  // 1. Sanitize user-provided limit
  let sanitizedLimit = parseInt(limit);
  if (isNaN(sanitizedLimit) || sanitizedLimit <= 0) {
    sanitizedLimit = 50; 
  }

  if (entity_type) {
    values.push(entity_type);
    conditions.push(`a.entity_type = $${values.length}`);
  }

  if (entity_id) {
    values.push(entity_id);
    conditions.push(`a.entity_id = $${values.length}`);
  }

  if (action) {
    values.push(action);
    conditions.push(`a.action = $${values.length}`);
  }

  values.push(sanitizedLimit);
  const result = await db.query(
    `
    SELECT a.*, u.name AS user_name
    FROM activity_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY a.created_at DESC
    LIMIT $${values.length}
    `,
    [...values]
  );

  return result.rows;
};
