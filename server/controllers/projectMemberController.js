const pool = require('../config/database')

// Check whether the logged-in user owns the project.
async function checkProjectOwnership(projectId, userId) {
  const result = await pool.query(
    `SELECT id
     FROM projects
     WHERE id = $1 AND user_id = $2`,
    [projectId, userId]
  )

  return result.rows.length > 0
}

// Check whether the logged-in user owns or belongs to the project.
async function checkProjectAccess(projectId, userId) {
  const result = await pool.query(
    `SELECT p.id
     FROM projects p
     LEFT JOIN project_members pm
       ON p.id = pm.project_id
     WHERE p.id = $1
       AND (
         p.user_id = $2
         OR pm.user_id = $2
       )
     LIMIT 1`,
    [projectId, userId]
  )

  return result.rows.length > 0
}

// GET PROJECT MEMBERS
// Owners and project members can view the team.
async function getProjectMembers(req, res, next) {
  const projectId = Number(req.params.id)

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({
      message: 'Invalid project ID.',
    })
  }

  try {
    const hasAccess = await checkProjectAccess(
      projectId,
      req.user.id
    )

    if (!hasAccess) {
      return res.status(404).json({
        message: 'Project not found.',
      })
    }

    const result = await pool.query(
      `SELECT
         pm.id,
         pm.user_id,
         u.name,
         u.email,
         pm.role,
         pm.added_at
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.added_at ASC`,
      [projectId]
    )

    return res.json({
      members: result.rows,
    })
  } catch (error) {
    return next(error)
  }
}

// ADD PROJECT MEMBER
// Only the project owner can add members.
async function addProjectMember(req, res, next) {
  const projectId = Number(req.params.id)
  const { email } = req.body || {}

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({
      message: 'Invalid project ID.',
    })
  }

  if (
    typeof email !== 'string' ||
    !email.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return res.status(400).json({
      message: 'Please provide a valid email address.',
    })
  }

  try {
    const isOwner = await checkProjectOwnership(
      projectId,
      req.user.id
    )

    if (!isOwner) {
      return res.status(404).json({
        message: 'Project not found.',
      })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Find a registered and verified user.
    const userResult = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE email = $1 AND is_verified = TRUE`,
      [cleanEmail]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Verified user not found.',
      })
    }

    const member = userResult.rows[0]

    // Prevent adding the project owner as a member.
    if (member.id === req.user.id) {
      return res.status(409).json({
        message: 'You are already the project owner.',
      })
    }

    const result = await pool.query(
      `INSERT INTO project_members (
         project_id,
         user_id,
         role
       )
       VALUES ($1, $2, 'member')
       RETURNING id, project_id, user_id, role, added_at`,
      [projectId, member.id]
    )

    return res.status(201).json({
      message: 'Team member added successfully.',
      member: {
        ...result.rows[0],
        name: member.name,
        email: member.email,
      },
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'This user is already a project member.',
      })
    }

    return next(error)
  }
}

// REMOVE PROJECT MEMBER
// Only the project owner can remove members.
async function removeProjectMember(req, res, next) {
  const projectId = Number(req.params.id)
  const userId = Number(req.params.userId)

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0 ||
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    return res.status(400).json({
      message: 'Invalid project or user ID.',
    })
  }

  try {
    const isOwner = await checkProjectOwnership(
      projectId,
      req.user.id
    )

    if (!isOwner) {
      return res.status(404).json({
        message: 'Project not found.',
      })
    }

    const result = await pool.query(
      `DELETE FROM project_members
       WHERE project_id = $1 AND user_id = $2
       RETURNING id`,
      [projectId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Project member not found.',
      })
    }

    return res.json({
      message: 'Team member removed successfully.',
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
}