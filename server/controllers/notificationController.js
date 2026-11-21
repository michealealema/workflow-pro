const pool = require('../config/database')

// Validate notification ID
function validateNotificationId(req, res) {
  const notificationId = Number(req.params.id)

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    res.status(400).json({
      message: 'Invalid notification ID.',
    })

    return null
  }

  return notificationId
}

// Get notifications belonging to the logged-in user
async function getNotifications(req, res, next) {
  try {
    const [notificationsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
            n.id,
            n.user_id,
            n.actor_id,
            actor.name AS actor_name,
            n.type,
            n.message,
            n.task_id,
            n.project_id,
            n.is_read,
            n.created_at
         FROM notifications n
         LEFT JOIN users actor
           ON n.actor_id = actor.id
         WHERE n.user_id = $1
         ORDER BY n.created_at DESC`,
        [req.user.id]
      ),

      pool.query(
        `SELECT COUNT(*)::INTEGER AS unread_count
         FROM notifications
         WHERE user_id = $1
           AND is_read = FALSE`,
        [req.user.id]
      ),
    ])

    return res.json({
      notifications: notificationsResult.rows,
      unreadCount: countResult.rows[0].unread_count,
    })
  } catch (error) {
    return next(error)
  }
}

// Mark one notification as read
async function markNotificationAsRead(req, res, next) {
  const notificationId = validateNotificationId(req, res)

  if (!notificationId) return

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1
         AND user_id = $2
       RETURNING id, is_read`,
      [notificationId, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Notification not found.',
      })
    }

    return res.json({
      message: 'Notification marked as read.',
      notification: result.rows[0],
    })
  } catch (error) {
    return next(error)
  }
}

// Mark all notifications as read
async function markAllNotificationsAsRead(req, res, next) {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1
         AND is_read = FALSE`,
      [req.user.id]
    )

    return res.json({
      message: 'All notifications marked as read.',
      updatedCount: result.rowCount,
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
}