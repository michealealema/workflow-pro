const express = require('express')

const authMiddleware = require('../middleware/authMiddleware')

const {
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController')

const {
  getTaskComments,
  createTaskComment,
} = require('../controllers/taskCommentController')

const router = express.Router()

// Get all tasks belonging to a project.
router.get(
  '/projects/:projectId/tasks',
  authMiddleware,
  getProjectTasks
)

// Create a task inside a project.
router.post(
  '/projects/:projectId/tasks',
  authMiddleware,
  createTask
)

// Update an existing task.
router.put(
  '/tasks/:id',
  authMiddleware,
  updateTask
)

// Delete an existing task.
router.delete(
  '/tasks/:id',
  authMiddleware,
  deleteTask
)

// Get all comments belonging to a task.
router.get(
  '/tasks/:taskId/comments',
  authMiddleware,
  getTaskComments
)

// Create a comment on a task.
router.post(
  '/tasks/:taskId/comments',
  authMiddleware,
  createTaskComment
)

module.exports = router