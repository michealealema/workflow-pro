const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../config/database')

// Email format validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

    // Save new user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [cleanName, cleanEmail, passwordHash]
    )

    return res.status(201).json({
      message: 'Account created successfully.',
      user: result.rows[0],
    })
  } catch (error) {
    // Handle duplicate email constraint
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
      `SELECT id, name, email, password_hash
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

module.exports = {
  register,
  login,
}