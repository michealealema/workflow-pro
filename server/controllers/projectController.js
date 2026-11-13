const pool = require('../config/database')

const ALLOWED_STATUSES = [
  'Planning',
  'In Progress',
  'Completed',
]

const MAX_NAME_LENGTH = 150
const MAX_DESCRIPTION_LENGTH = 2000

function handleControllerError(error, res, next) {
  if (typeof next === 'function') {
    return next(error)
  }

  console.error(error.message)
  return res.status(500).json({
    message: 'Server error.',
  })
}

// Validate project request data
function validateProjectData(req, res, requireStatus = false) {
  const { name, description, status } = req.body || {}

  if (typeof req.body !== 'object' || Array.isArray(req.body) || req.body === null) {
    res.status(400).json({
      message: 'Request body must be a valid object.',
    })
    return null
  }

  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({
      message: 'Project name is required.',
    })
    return null
  }

  if (name.trim().length > MAX_NAME_LENGTH) {
    res.status(400).json({
      message: 'Project name must be 150 characters or fewer.',
    })
    return null
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== 'string'
  ) {
    res.status(400).json({
      message: 'Description must be text.',
    })
    return null
  }

  if (
    typeof description === 'string' &&
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    res.status(400).json({
      message: 'Description must be 2000 characters or fewer.',
    })
    return null
  }

  if (requireStatus && status === undefined) {
    res.status(400).json({
      message: 'Project status is required.',
    })
    return null
  }

  const projectStatus = status === undefined ? 'Planning' : status

  if (
    (requireStatus || status !== undefined) &&
    !ALLOWED_STATUSES.includes(projectStatus)
  ) {
    res.status(400).json({
      message: 'Invalid project status.',
    })
    return null
  }

  return {
    name: name.trim(),
    description: description?.trim() || null,
    status: projectStatus,
  }
}

// Get all projects belonging to the logged-in user
async function getProjects(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, description, status, created_at
       FROM projects
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )

    return res.json({
      projects: result.rows,
    })
  } catch (error) {
    return handleControllerError(error, res, next)
  }
}

// Create a new project
async function createProject(req, res, next) {
  const project = validateProjectData(req, res)

  if (!project) return

  try {
    const result = await pool.query(
      `INSERT INTO projects (user_id, name, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, status, created_at`,
      [
        req.user.id,
        project.name,
        project.description,
        project.status,
      ]
    )

    return res.status(201).json({
      message: 'Project created successfully.',
      project: result.rows[0],
    })
  } catch (error) {
    return handleControllerError(error, res, next)
  }
}

// Update an existing project
async function updateProject(req, res, next) {
  const projectId = Number(req.params.id)

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({
      message: 'Invalid project ID.',
    })
  }

  const project = validateProjectData(req, res, true)

  if (!project) return

  try {
    const result = await pool.query(
      `UPDATE projects
       SET name = $1,
           description = $2,
           status = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id, name, description, status, created_at`,
      [
        project.name,
        project.description,
        project.status,
        projectId,
        req.user.id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Project not found.',
      })
    }

    return res.json({
      message: 'Project updated successfully.',
      project: result.rows[0],
    })
  } catch (error) {
    return handleControllerError(error, res, next)
  }
}

// Delete an existing project
async function deleteProject(req, res, next) {
  const projectId = Number(req.params.id)

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({
      message: 'Invalid project ID.',
    })
  }

  try {
    const result = await pool.query(
      `DELETE FROM projects
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [projectId, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Project not found.',
      })
    }

    return res.json({
      message: 'Project deleted successfully.',
      projectId: result.rows[0].id,
    })
  } catch (error) {
    return handleControllerError(error, res, next)
  }
}

module.exports = {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
}