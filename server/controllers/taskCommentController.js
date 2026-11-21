const pool = require('../config/database')

// Validate task ID
function validateTaskId(req, res) {
  const taskId = Number(req.params.taskId)

  if (!Number.isInteger(taskId) || taskId <= 0) {
    res.status(400).json({
      message: 'Invalid task ID.',
    })

    return null
  }

  return taskId
}

// Get all comments belonging to a task
// Accessible by the project owner and registered team members.
async function getTaskComments(req, res, next) {
  const taskId = validateTaskId(req, res)

  if (!taskId) return

  try {
    const result = await pool.query(
      `SELECT
          tc.id,
          tc.task_id,
          tc.user_id,
          u.name AS author_name,
          u.email AS author_email,
          tc.content,
          tc.created_at,
          tc.updated_at
       FROM task_comments tc
       JOIN tasks t
         ON tc.task_id = t.id
       JOIN projects p
         ON t.project_id = p.id
       JOIN users u
         ON tc.user_id = u.id
       WHERE tc.task_id = $1
         AND (
           p.user_id = $2
           OR EXISTS (
             SELECT 1
             FROM project_members pm
             WHERE pm.project_id = p.id
               AND pm.user_id = $2
           )
         )
       ORDER BY tc.created_at ASC`,
      [taskId, req.user.id]
    )

    return res.json({
      comments: result.rows,
    })
  } catch (error) {
    return next(error)
  }
}

// Create a comment on a task
// Accessible by the project owner and registered team members.
async function createTaskComment(req, res, next) {
  const taskId = validateTaskId(req, res)

  if (!taskId) return

  if (
    typeof req.body !== 'object' ||
    req.body === null ||
    Array.isArray(req.body)
  ) {
    return res.status(400).json({
      message: 'Request body must be a valid object.',
    })
  }

  const { content } = req.body

  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({
      message: 'Comment content is required.',
    })
  }

  if (content.trim().length > 5000) {
    return res.status(400).json({
      message: 'Comment must be 5000 characters or fewer.',
    })
  }

  try {
    const result = await pool.query(
      `INSERT INTO task_comments (
          task_id,
          user_id,
          content
       )
       SELECT
          t.id,
          $2,
          $3
       FROM tasks t
       JOIN projects p
         ON t.project_id = p.id
       WHERE t.id = $1
         AND (
           p.user_id = $2
           OR EXISTS (
             SELECT 1
             FROM project_members pm
             WHERE pm.project_id = p.id
               AND pm.user_id = $2
           )
         )
       RETURNING
          id,
          task_id,
          user_id,
          content,
          created_at,
          updated_at`,
      [taskId, req.user.id, content.trim()]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Task not found.',
      })
    }

    return res.status(201).json({
      message: 'Comment created successfully.',
      comment: result.rows[0],
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getTaskComments,
  createTaskComment,
}