const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const pool = require('../config/database')

const router = express.Router()

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found.',
      })
    }

    res.json({
      message: 'You accessed a protected route!',
      user: result.rows[0],
    })
  } catch (error) {
    console.error('Profile error:', error.message)

    res.status(500).json({
      message: 'Server error.',
    })
  }
})

module.exports = router