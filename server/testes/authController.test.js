
// Mock database
jest.mock('../config/database', () => ({
  query: jest.fn(),
}))

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}))

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}))

const pool = require('../config/database')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const {
  register,
  login,
} = require('../controllers/authController')

beforeEach(() => {
  jest.clearAllMocks()
})

// ========================================
// REGISTRATION TESTS
// ========================================

describe('Auth Controller - Registration', () => {
  test('returns 409 when email violates the unique database constraint', async () => {
    const req = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'ExamplePassword123!',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    pool.query.mockResolvedValueOnce({
      rows: [],
    })

    const duplicateEmailError = new Error('Duplicate email')
    duplicateEmailError.code = '23505'

    pool.query.mockRejectedValueOnce(duplicateEmailError)

    await register(req, res)

    expect(pool.query).toHaveBeenCalledTimes(2)

    expect(res.status).toHaveBeenCalledWith(409)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Email is already registered.',
    })
  })

  test('rejects registration with an invalid email', async () => {
    const req = {
      body: {
        name: 'Test User',
        email: 'invalid-email',
        password: 'ExamplePassword123!',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await register(req, res)

    expect(res.status).toHaveBeenCalledWith(400)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Please provide a valid email address.',
    })

    expect(pool.query).not.toHaveBeenCalled()
  })

  test('successfully registers a new user', async () => {
    const req = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'ExamplePassword123!',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    // First query: user does not exist.
    pool.query.mockResolvedValueOnce({
      rows: [],
    })

    // Second query: user successfully created.
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          created_at: '2026-11-13',
        },
      ],
    })

    await register(req, res)

    // Verify password was hashed.
    expect(bcrypt.hash).toHaveBeenCalledWith(
      'ExamplePassword123!',
      12
    )

    // Verify database was called twice.
    expect(pool.query).toHaveBeenCalledTimes(2)

    // Verify successful response.
    expect(res.status).toHaveBeenCalledWith(201)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Account created successfully.',
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2026-11-13',
      },
    })
  })

  test('rejects registration when required fields are missing', async () => {
    const req = {
      body: {
        name: '',
        email: 'test@example.com',
        password: 'ExamplePassword123!',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await register(req, res)

    expect(res.status).toHaveBeenCalledWith(400)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Name, email, and password are required.',
    })

    expect(pool.query).not.toHaveBeenCalled()
  })

  test('rejects registration when password is shorter than 8 characters', async () => {
    const req = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: '1234567',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await register(req, res)

    expect(res.status).toHaveBeenCalledWith(400)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Password must be at least 8 characters long.',
    })

    expect(pool.query).not.toHaveBeenCalled()
  })
})

// ========================================
// LOGIN TESTS
// ========================================

describe('Auth Controller - Login', () => {
  test('rejects login with an invalid email', async () => {
    const req = {
      body: {
        email: 'invalid-email',
        password: 'ExamplePassword123!',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await login(req, res)

    expect(res.status).toHaveBeenCalledWith(400)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Please provide a valid email address.',
    })

    expect(pool.query).not.toHaveBeenCalled()
  })

  test('rejects login when email and password are missing', async () => {
    const req = {
      body: {},
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await login(req, res)

    expect(res.status).toHaveBeenCalledWith(400)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Email and password are required.',
    })

    expect(pool.query).not.toHaveBeenCalled()
  })

  test('returns 401 when the user does not exist', async () => {
    const req = {
      body: {
        email: 'unknown@example.com',
        password: 'ExamplePassword123!',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    pool.query.mockResolvedValueOnce({
      rows: [],
    })

    await login(req, res)

    expect(res.status).toHaveBeenCalledWith(401)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid email or password.',
    })

    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  test('returns 401 when the password is incorrect', async () => {
    const req = {
      body: {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          password_hash: 'hashed-password',
        },
      ],
    })

    bcrypt.compare.mockResolvedValueOnce(false)

    await login(req, res)

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'WrongPassword123!',
      'hashed-password'
    )

    expect(res.status).toHaveBeenCalledWith(401)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid email or password.',
    })

    expect(jwt.sign).not.toHaveBeenCalled()
  })

  test('successfully logs in with valid credentials', async () => {
    const req = {
      body: {
        email: 'test@example.com',
        password: 'ExamplePassword123!',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          password_hash: 'hashed-password',
        },
      ],
    })

    bcrypt.compare.mockResolvedValueOnce(true)

    jwt.sign.mockReturnValueOnce('test-jwt-token')

    await login(req, res)

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'ExamplePassword123!',
      'hashed-password'
    )

    expect(jwt.sign).toHaveBeenCalledWith(
      {
        id: 1,
        userId: 1,
        email: 'test@example.com',
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
      }
    )

    expect(res.json).toHaveBeenCalledWith({
      message: 'Login successful!',
      token: 'test-jwt-token',
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      },
    })
  })

  test('returns 500 when the database query fails', async () => {
    const req = {
      body: {
        email: 'test@example.com',
        password: 'ExamplePassword123!',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    const databaseError = new Error('Database connection failed')

    pool.query.mockRejectedValueOnce(databaseError)

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      await login(req, res)

      expect(res.status).toHaveBeenCalledWith(500)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error.',
      })
    } finally {
      consoleSpy.mockRestore()
    }
  })
})