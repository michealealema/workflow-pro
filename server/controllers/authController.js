const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const pool = require('../config/database')

const generateVerificationToken = require('../utils/verificationToken')
const sendVerificationEmail = require('../services/emailService')

// Email format validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ========================================
// REGISTER
// ========================================

async function register(req, res) {
  const { name, email, password } = req.body || {}

  // Validate required fields
  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: 'Name, email, and password are required.',
    })
  }

  // Validate email format
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      message: 'Please provide a valid email address.',
    })
  }

  // Validate minimum password length
  if (password.length < 8) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long.',
    })
  }

  try {
    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()

    // Check whether email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [cleanEmail]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'Email is already registered.',
      })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Generate verification token
    const { token, tokenHash } = generateVerificationToken()

    // Token expires after 30 minutes
    const tokenExpiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    )

    // Create unverified account
    const result = await pool.query(
      `INSERT INTO users (
        name,
        email,
        password_hash,
        is_verified,
        verification_token_hash,
        verification_token_expires_at
      )
      VALUES ($1, $2, $3, FALSE, $4, $5)
      RETURNING id, name, email, created_at, is_verified`,
      [
        cleanName,
        cleanEmail,
        passwordHash,
        tokenHash,
        tokenExpiresAt,
      ]
    )

    const newUser = result.rows[0]

    // Send verification email
    try {
      await sendVerificationEmail(cleanEmail, token)
    } catch (emailError) {
      console.error(
        'Verification email sending failed:',
        emailError.message
      )

      return res.status(503).json({
        message:
          'Account created, but the verification email could not be sent. Please try again later.',
      })
    }

    return res.status(201).json({
      message:
        'Account created. Please check your email to verify your account.',
      user: newUser,
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Email is already registered.',
      })
    }

    console.error('Registration error:', error.message)

    return res.status(500).json({
      message: 'Server error.',
    })
  }
}

// ========================================
// LOGIN
// ========================================

async function login(req, res) {
  const { email, password } = req.body || {}

  // Validate required fields
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: 'Email and password are required.',
    })
  }

  // Validate email format
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      message: 'Please provide a valid email address.',
    })
  }

  try {
    const cleanEmail = email.trim().toLowerCase()

    const result = await pool.query(
      `SELECT id, name, email, password_hash, is_verified
       FROM users
       WHERE email = $1`,
      [cleanEmail]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      })
    }

    const user = result.rows[0]

    // Compare submitted password with stored hash
    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      })
    }

    // Require email verification
    if (!user.is_verified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
      })
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
      }
    )

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Login error:', error.message)

    return res.status(500).json({
      message: 'Server error.',
    })
  }
}

// ========================================
// VERIFY EMAIL
// ========================================

async function verifyEmail(req, res) {
  const { token } = req.body || {}

  // Validate token
  if (
    typeof token !== 'string' ||
    !token.trim()
  ) {
    return res.status(400).json({
      message: 'Verification token is required.',
    })
  }

  try {
    // Hash received token
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')

    // Verify token and activate account
    const result = await pool.query(
      `UPDATE users
       SET
         is_verified = TRUE,
         verification_token_hash = NULL,
         verification_token_expires_at = NULL
       WHERE verification_token_hash = $1
         AND verification_token_expires_at > NOW()
         AND is_verified = FALSE
       RETURNING id, name, email`,
      [tokenHash]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: 'Invalid or expired verification link.',
      })
    }

    return res.status(200).json({
      message: 'Email verified successfully. You can now log in.',
      user: result.rows[0],
    })
  } catch (error) {
    console.error('Email verification error:', error.message)

    return res.status(500).json({
      message: 'Server error.',
    })
  }
}

// ========================================
// RESEND VERIFICATION EMAIL
// ========================================

async function resendVerificationEmail(req, res) {
  const { email } = req.body || {}

  // Validate email
  if (
    typeof email !== 'string' ||
    !email.trim() ||
    !emailRegex.test(email.trim())
  ) {
    return res.status(400).json({
      message: 'Please provide a valid email address.',
    })
  }

  try {
    const cleanEmail = email.trim().toLowerCase()

    // Find the account
    const result = await pool.query(
      `SELECT id, is_verified
       FROM users
       WHERE email = $1`,
      [cleanEmail]
    )

    // Generic response to avoid revealing registered accounts
    const genericMessage =
      'If an unverified account exists, a verification email will be sent.'

    if (
      result.rows.length === 0 ||
      result.rows[0].is_verified
    ) {
      return res.status(200).json({
        message: genericMessage,
      })
    }

    // Generate a fresh verification token
    const { token, tokenHash } = generateVerificationToken()

    // Set a new 30-minute expiry
    const tokenExpiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    )

    // Save the new token hash
    const updateResult = await pool.query(
      `UPDATE users
       SET
         verification_token_hash = $1,
         verification_token_expires_at = $2
       WHERE id = $3
         AND is_verified = FALSE
       RETURNING id`,
      [tokenHash, tokenExpiresAt, result.rows[0].id]
    )

    // Account may have been verified concurrently
    if (updateResult.rows.length === 0) {
      return res.status(200).json({
        message: genericMessage,
      })
    }

    // Send the new verification email
    try {
      await sendVerificationEmail(cleanEmail, token)
    } catch (emailError) {
      console.error(
        'Resend verification email failed:',
        emailError.message
      )
    }

    return res.status(200).json({
      message: genericMessage,
    })
  } catch (error) {
    console.error(
      'Resend verification error:',
      error.message
    )

    return res.status(500).json({
      message: 'Server error.',
    })
  }
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
}