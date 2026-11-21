const express = require('express')

const authMiddleware = require('../middleware/authMiddleware')

const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('../controllers/notificationController')

const router = express.Router()

// Get notifications belonging to the logged-in user.
router.get(
  '/',
  authMiddleware,
  getNotifications
)

// Mark one notification as read.
router.patch(
  '/:id/read',
  authMiddleware,
  markNotificationAsRead
)

// Mark all notifications as read.
router.patch(
  '/read-all',
  authMiddleware,
  markAllNotificationsAsRead
)

module.exports = router