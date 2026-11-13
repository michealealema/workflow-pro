const express = require('express')
const rateLimit = require('express-rate-limit')

const { register, login } = require('../controllers/authcontroller')

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    message: 'Too many registration attempts. Please try again after one hour.',
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

router.post('/register', registerLimiter, register)
router.post('/login', loginLimiter, login)

module.exports = router