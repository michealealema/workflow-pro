const express = require('express')

const authMiddleware = require('../middleware/authMiddleware')

const {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController')

const router = express.Router()

// Get all projects belonging to the logged-in user.
router.get('/', authMiddleware, getProjects)

// Create a project.
router.post('/', authMiddleware, createProject)

// Update a project.
router.put('/:id', authMiddleware, updateProject)

// Delete a project.
router.delete('/:id', authMiddleware, deleteProject)

module.exports = router