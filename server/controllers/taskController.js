const pool = require('../config/database')
const {
  createNotification,
} = require('../services/notificationService')

const ALLOWED_STATUSES = [
  'To Do',
  'In Progress',
  'In Review',
  'Completed',
]

const ALLOWED_PRIORITIES = [
  'Low',
  'Medium',
  'High',
]

const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000

// Handle controller errors
function handleControllerError(error, res, next) {
  if (
    error.code === '23514' &&
    error.constraint === 'tasks_dates_check'
  ) {
    return res.status(400).json({
      message: 'Start date cannot be after the due date.',
    })
  }

  if (typeof next === 'function') {
    return next(error)
  }

  console.error(error.message)

  return res.status(500).json({
    message: 'Server error.',
  })
}

// Validate request body
function validateRequestBody(req, res) {
  if (
    typeof req.body !== 'object' ||
    req.body === null ||
    Array.isArray(req.body)
  ) {
    res.status(400).json({
      message: 'Request body must be a valid object.',
    })

    return false
  }

  return true
}

// Validate task date format
function isValidDate(value) {
  if (typeof value !== 'string') {
    return false
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

// Validate project ID
function validateProjectId(req, res) {
  const projectId = Number(req.params.projectId)

  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({
      message: 'Invalid project ID.',
    })

    return null
  }

  return projectId
}

// Validate task ID
function validateTaskId(req, res) {
  const taskId = Number(req.params.id)

  if (!Number.isInteger(taskId) || taskId <= 0) {
    res.status(400).json({
      message: 'Invalid task ID.',
    })

    return null
  }

  return taskId
}

// Validate assigned user ID
function validateAssignedUserId(value, res) {
  if (value === undefined || value === null) {
    return null
  }

  const userId = Number(value)

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({
      message: 'Invalid assigned user ID.',
    })

    return undefined
  }

  return userId
}

// Check whether the requester can access the project
// and whether the assigned user belongs to that project.
async function checkAssignee(
  projectId,
  requesterId,
  assignedUserId,
  client = pool
) {
  const result = await client.query(
    `SELECT
        p.id,
        EXISTS (
          SELECT 1
          FROM users u
          WHERE u.id = $3
            AND (
              u.id = p.user_id
              OR EXISTS (
                SELECT 1
                FROM project_members pm
                WHERE pm.project_id = p.id
                  AND pm.user_id = u.id
              )
            )
        ) AS assignee_allowed
     FROM projects p
     WHERE p.id = $1
       AND (
         p.user_id = $2
         OR EXISTS (
           SELECT 1
           FROM project_members pm
           WHERE pm.project_id = p.id
             AND pm.user_id = $2
         )
       )`,
    [projectId, requesterId, assignedUserId]
  )

  if (result.rows.length === 0) {
    return {
      projectExists: false,
      assigneeAllowed: false,
    }
  }

  return {
    projectExists: true,
    assigneeAllowed: result.rows[0].assignee_allowed,
  }
}

// Validate task data when creating a task
function validateCreateTask(req, res) {
  if (!validateRequestBody(req, res)) {
    return null
  }

  const {
    title,
    description,
    status,
    priority,
    start_date,
    due_date,
    assigned_to,
  } = req.body

  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({
      message: 'Task title is required.',
    })

    return null
  }

  if (title.trim().length > MAX_TITLE_LENGTH) {
    res.status(400).json({
      message: 'Task title must be 200 characters or fewer.',
    })

    return null
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== 'string'
  ) {
    res.status(400).json({
      message: 'Task description must be text.',
    })

    return null
  }

  if (
    typeof description === 'string' &&
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    res.status(400).json({
      message: 'Task description must be 5000 characters or fewer.',
    })

    return null
  }

  const taskStatus = status === undefined ? 'To Do' : status

  if (!ALLOWED_STATUSES.includes(taskStatus)) {
    res.status(400).json({
      message: 'Invalid task status.',
    })

    return null
  }

  const taskPriority = priority === undefined ? 'Medium' : priority

  if (!ALLOWED_PRIORITIES.includes(taskPriority)) {
    res.status(400).json({
      message: 'Invalid task priority.',
    })

    return null
  }

  if (
    start_date !== undefined &&
    start_date !== null &&
    !isValidDate(start_date)
  ) {
    res.status(400).json({
      message: 'Invalid start date. Use YYYY-MM-DD.',
    })

    return null
  }

  if (
    due_date !== undefined &&
    due_date !== null &&
    !isValidDate(due_date)
  ) {
    res.status(400).json({
      message: 'Invalid due date. Use YYYY-MM-DD.',
    })

    return null
  }

  const startDate = start_date ?? null
  const dueDate = due_date ?? null

  if (startDate && dueDate && startDate > dueDate) {
    res.status(400).json({
      message: 'Start date cannot be after the due date.',
    })

    return null
  }

  const assignedTo = validateAssignedUserId(assigned_to, res)

  if (assignedTo === undefined) {
    return null
  }

  return {
    title: title.trim(),
    description: description?.trim() || null,
    status: taskStatus,
    priority: taskPriority,
    start_date: startDate,
    due_date: dueDate,
    assigned_to: assignedTo,
  }
}

// Get all tasks belonging to a project
// Accessible by the owner and registered team members.
async function getProjectTasks(req, res, next) {
  const projectId = validateProjectId(req, res)

  if (!projectId) return

  try {
    const projectResult = await pool.query(
      `SELECT p.id
       FROM projects p
       WHERE p.id = $1
         AND (
           p.user_id = $2
           OR EXISTS (
             SELECT 1
             FROM project_members pm
             WHERE pm.project_id = p.id
               AND pm.user_id = $2
           )
         )`,
      [projectId, req.user.id]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Project not found.',
      })
    }

    const result = await pool.query(
      `SELECT
          t.id,
          t.project_id,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.start_date,
          t.due_date,
          t.assigned_to,
          u.name AS assignee_name,
          u.email AS assignee_email,
          t.created_at,
          t.updated_at
       FROM tasks t
       LEFT JOIN users u
         ON t.assigned_to = u.id
       WHERE t.project_id = $1
       ORDER BY
          t.due_date ASC NULLS LAST,
          t.created_at DESC`,
      [projectId]
    )

    return res.json({
      tasks: result.rows,
    })
  } catch (error) {
    return handleControllerError(error, res, next)
  }
}

// Create a new task
// Automatically notifies another user when assigned.
async function createTask(req, res, next) {
  const projectId = validateProjectId(req, res)

  if (!projectId) return

  const task = validateCreateTask(req, res)

  if (!task) return

  let client
  let transactionStarted = false

  try {
    client = await pool.connect()

    await client.query('BEGIN')
    transactionStarted = true

    // Verify project access and assignee membership.
    if (task.assigned_to !== null) {
      const assignment = await checkAssignee(
        projectId,
        req.user.id,
        task.assigned_to,
        client
      )

      if (!assignment.projectExists) {
        await client.query('ROLLBACK')
        transactionStarted = false

        return res.status(404).json({
          message: 'Project not found.',
        })
      }

      if (!assignment.assigneeAllowed) {
        await client.query('ROLLBACK')
        transactionStarted = false

        return res.status(400).json({
          message: 'Assigned user must belong to this project.',
        })
      }
    }

    // Insert task.
    const result = await client.query(
      `INSERT INTO tasks (
          project_id,
          title,
          description,
          status,
          priority,
          start_date,
          due_date,
          assigned_to
       )
       SELECT
          p.id,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9
       FROM projects p
       WHERE p.id = $1
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
          project_id,
          title,
          description,
          status,
          priority,
          start_date,
          due_date,
          assigned_to,
          created_at,
          updated_at`,
      [
        projectId,
        req.user.id,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.start_date,
        task.due_date,
        task.assigned_to,
      ]
    )

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(404).json({
        message: 'Project not found.',
      })
    }

    const savedTask = result.rows[0]

    // Notify another user when assigned.
    if (
      savedTask.assigned_to !== null &&
      Number(savedTask.assigned_to) !== Number(req.user.id)
    ) {
      await createNotification(
        {
          userId: savedTask.assigned_to,
          actorId: req.user.id,
          type: 'task_assigned',
          message: `You have been assigned a new task: ${savedTask.title}.`,
          taskId: savedTask.id,
          projectId: savedTask.project_id,
        },
        client
      )
    }

    await client.query('COMMIT')
    transactionStarted = false

    return res.status(201).json({
      message: 'Task created successfully.',
      task: savedTask,
    })
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error(
          'Transaction rollback failed:',
          rollbackError.message
        )
      }
    }

    return handleControllerError(error, res, next)
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Validate task data when updating a task
function validateUpdateTask(req, res) {
  if (!validateRequestBody(req, res)) {
    return null
  }

  const allowedFields = [
    'title',
    'description',
    'status',
    'priority',
    'start_date',
    'due_date',
    'assigned_to',
  ]

  const fields = Object.keys(req.body)

  if (fields.length === 0) {
    res.status(400).json({
      message: 'Provide at least one field to update.',
    })

    return null
  }

  const invalidFields = fields.filter(
    (field) => !allowedFields.includes(field)
  )

  if (invalidFields.length > 0) {
    res.status(400).json({
      message: 'Request contains unsupported fields.',
      fields: invalidFields,
    })

    return null
  }

  const updates = {}

  if (Object.hasOwn(req.body, 'title')) {
    const { title } = req.body

    if (typeof title !== 'string' || !title.trim()) {
      res.status(400).json({
        message: 'Task title cannot be empty.',
      })

      return null
    }

    if (title.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({
        message: 'Task title must be 200 characters or fewer.',
      })

      return null
    }

    updates.title = title.trim()
  }

  if (Object.hasOwn(req.body, 'description')) {
    const { description } = req.body

    if (
      description !== null &&
      typeof description !== 'string'
    ) {
      res.status(400).json({
        message: 'Task description must be text or null.',
      })

      return null
    }

    if (
      typeof description === 'string' &&
      description.length > MAX_DESCRIPTION_LENGTH
    ) {
      res.status(400).json({
        message: 'Task description must be 5000 characters or fewer.',
      })

      return null
    }

    updates.description = description?.trim() || null
  }

  if (Object.hasOwn(req.body, 'status')) {
    if (!ALLOWED_STATUSES.includes(req.body.status)) {
      res.status(400).json({
        message: 'Invalid task status.',
      })

      return null
    }

    updates.status = req.body.status
  }

  if (Object.hasOwn(req.body, 'priority')) {
    if (!ALLOWED_PRIORITIES.includes(req.body.priority)) {
      res.status(400).json({
        message: 'Invalid task priority.',
      })

      return null
    }

    updates.priority = req.body.priority
  }

  for (const field of ['start_date', 'due_date']) {
    if (Object.hasOwn(req.body, field)) {
      const value = req.body[field]

      if (value !== null && !isValidDate(value)) {
        res.status(400).json({
          message: `Invalid ${field}. Use YYYY-MM-DD or null.`,
        })

        return null
      }

      updates[field] = value
    }
  }

  if (Object.hasOwn(req.body, 'assigned_to')) {
    const assignedTo = validateAssignedUserId(
      req.body.assigned_to,
      res
    )

    if (assignedTo === undefined) {
      return null
    }

    updates.assigned_to = assignedTo
  }

  return updates
}

// Update an existing task
// Automatically notifies a newly assigned user.
async function updateTask(req, res, next) {
  const taskId = validateTaskId(req, res)

  if (!taskId) return

  const updates = validateUpdateTask(req, res)

  if (!updates) return

  let client
  let transactionStarted = false

  try {
    client = await pool.connect()

    await client.query('BEGIN')
    transactionStarted = true

    let existingTask = null

    // Retrieve and lock the task when its assignee is changing.
    if (Object.hasOwn(updates, 'assigned_to')) {
      const taskResult = await client.query(
        `SELECT
           t.id,
           t.project_id,
           t.assigned_to,
           t.title
         FROM tasks t
         JOIN projects p ON t.project_id = p.id
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
         FOR UPDATE OF t`,
        [taskId, req.user.id]
      )

      if (taskResult.rows.length === 0) {
        await client.query('ROLLBACK')
        transactionStarted = false

        return res.status(404).json({
          message: 'Task not found.',
        })
      }

      existingTask = taskResult.rows[0]

      // Validate the new assignee.
      if (updates.assigned_to !== null) {
        const assignment = await checkAssignee(
          existingTask.project_id,
          req.user.id,
          updates.assigned_to,
          client
        )

        if (!assignment.projectExists) {
          await client.query('ROLLBACK')
          transactionStarted = false

          return res.status(404).json({
            message: 'Project not found.',
          })
        }

        if (!assignment.assigneeAllowed) {
          await client.query('ROLLBACK')
          transactionStarted = false

          return res.status(400).json({
            message: 'Assigned user must belong to this project.',
          })
        }
      }
    }

    // Map allowed request fields to database columns.
    const fieldMapping = {
      title: 'title',
      description: 'description',
      status: 'status',
      priority: 'priority',
      start_date: 'start_date',
      due_date: 'due_date',
      assigned_to: 'assigned_to',
    }

    const values = []
    const setClauses = []

    for (const [field, value] of Object.entries(updates)) {
      values.push(value)

      setClauses.push(
        `${fieldMapping[field]} = $${values.length}`
      )
    }

    setClauses.push('updated_at = NOW()')

    values.push(taskId)
    const taskIdParameter = values.length

    values.push(req.user.id)
    const userIdParameter = values.length

    // Update task while checking project access.
    const result = await client.query(
      `UPDATE tasks AS t
       SET ${setClauses.join(', ')}
       FROM projects AS p
       WHERE t.id = $${taskIdParameter}
         AND t.project_id = p.id
         AND (
           p.user_id = $${userIdParameter}
           OR EXISTS (
             SELECT 1
             FROM project_members pm
             WHERE pm.project_id = p.id
               AND pm.user_id = $${userIdParameter}
           )
         )
       RETURNING
          t.id,
          t.project_id,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.start_date,
          t.due_date,
          t.assigned_to,
          t.created_at,
          t.updated_at`,
      values
    )

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(404).json({
        message: 'Task not found.',
      })
    }

    const updatedTask = result.rows[0]

    // Notify only when the assignee genuinely changes.
    // Do not notify when assigning to yourself.
    if (
      existingTask &&
      updatedTask.assigned_to !== null &&
      Number(updatedTask.assigned_to) !==
        Number(existingTask.assigned_to) &&
      Number(updatedTask.assigned_to) !== Number(req.user.id)
    ) {
      await createNotification(
        {
          userId: updatedTask.assigned_to,
          actorId: req.user.id,
          type: 'task_assigned',
          message: `You have been assigned a task: ${updatedTask.title}.`,
          taskId: updatedTask.id,
          projectId: updatedTask.project_id,
        },
        client
      )
    }

    // Commit task update and notification together.
    await client.query('COMMIT')
    transactionStarted = false

    return res.json({
      message: 'Task updated successfully.',
      task: updatedTask,
    })
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error(
          'Transaction rollback failed:',
          rollbackError.message
        )
      }
    }

    return handleControllerError(error, res, next)
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Delete an existing task
// Accessible by the owner and registered team members.
async function deleteTask(req, res, next) {
  const taskId = validateTaskId(req, res)

  if (!taskId) return

  try {
    const result = await pool.query(
      `DELETE FROM tasks t
       USING projects p
       WHERE t.id = $1
         AND t.project_id = p.id
         AND (
           p.user_id = $2
           OR EXISTS (
             SELECT 1
             FROM project_members pm
             WHERE pm.project_id = p.id
               AND pm.user_id = $2
           )
         )
       RETURNING t.id`,
      [taskId, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Task not found.',
      })
    }

    return res.json({
      message: 'Task deleted successfully.',
      taskId: result.rows[0].id,
    })
  } catch (error) {
    return handleControllerError(error, res, next)
  }
}

module.exports = {
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
}