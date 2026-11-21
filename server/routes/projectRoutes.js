const express = require('express')

const authMiddleware = require('../middleware/authMiddleware')

const {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController')

const {
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} = require('../controllers/projectMemberController')

const router = express.Router()

// Project CRUD
router.get('/', authMiddleware, getProjects)
router.post('/', authMiddleware, createProject)
router.put('/:id', authMiddleware, updateProject)
router.delete('/:id', authMiddleware, deleteProject)

// Project team members
router.get('/:id/members', authMiddleware, getProjectMembers)
router.post('/:id/members', authMiddleware, addProjectMember)
router.delete('/:id/members/:userId', authMiddleware, removeProjectMember)

module.exports = router