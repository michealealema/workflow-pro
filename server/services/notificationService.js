const pool = require('../config/database')

// Create a notification for a user.
// Accepts an optional database client so callers can use transactions.
async function createNotification(
  {
    userId,
    actorId,
    type,
    message,
    taskId = null,
    projectId = null,
  },
  client = pool
) {
  const result = await client.query(
    `INSERT INTO notifications (
        user_id,
        actor_id,
        type,
        message,
        task_id,
        project_id
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      actorId,
      type,
      message,
      taskId,
      projectId,
    ]
  )

  return result.rows[0]
}

module.exports = {
  createNotification,
}