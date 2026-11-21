const express = require('express')
const rateLimit = require('express-rate-limit')

const {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
} = require('../controllers/authcontroller')

const router = express.Router()

// Login rate limiter
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

// Registration rate limiter
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    message: 'Too many registration attempts. Please try again after one hour.',
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

// Email verification rate limiter
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    message: 'Too many verification attempts. Please try again later.',
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

// Resend verification email rate limiter
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: {
    message: 'Too many verification email requests. Please try again later.',
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

// Routes
router.post('/register', registerLimiter, register)
router.post('/login', loginLimiter, login)
router.post('/verify-email', verificationLimiter, verifyEmail)

router.post(
  '/resend-verification',
  resendVerificationLimiter,
  resendVerificationEmail
)

module.exports = router