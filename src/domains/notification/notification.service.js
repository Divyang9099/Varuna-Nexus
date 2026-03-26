const db = require('../../core/config/db');

/**
 * Create a notification — called internally by other services
 */
exports.createNotification = async ({ user_id, title, message }) => {
  const result = await db.query(
    `INSERT INTO notifications (user_id, title, message)
     VALUES ($1,$2,$3) RETURNING *`,
    [user_id, title, message]
  );
  return result.rows[0];
};

/**
 * Get notifications for a specific user
 */
exports.getNotifications = async (userId) => {
  const result = await db.query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Mark a single notification as read
 */
exports.markAsRead = async (id, userId) => {
  const result = await db.query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );
  if (!result.rows.length) {
    throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
  }
  return result.rows[0];
};

/**
 * Mark all notifications read for a user
 */
exports.markAllRead = async (userId) => {
  await db.query(
    'UPDATE notifications SET is_read = true WHERE user_id = $1',
    [userId]
  );
  return { success: true };
};

/**
 * Delete a notification
 */
exports.deleteNotification = async (id, userId) => {
  const result = await db.query('DELETE FROM notifications WHERE id=$1 AND user_id=$2 RETURNING id', [id, userId]);
  if (!result.rows.length) {
    throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
  }
};
