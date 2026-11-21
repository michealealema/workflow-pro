// ========================================
// MOCKS
// ========================================

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

// Mock verification token generator
jest.mock('../utils/verificationToken', () =>
  jest.fn(() => ({
    token: 'test-verification-token',
    tokenHash: 'test-token-hash',
  }))
)

// Mock email service
jest.mock('../services/emailService', () =>
  jest.fn().mockResolvedValue()
)

// Imports
const pool = require('../config/database')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const generateVerificationToken = require('../utils/verificationToken')
const sendVerificationEmail = require('../services/emailService')

const {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
} = require('../controllers/authcontroller')

// Reset mocks before every test
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

    pool.query.mockResolvedValueOnce({ rows: [] })

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

    pool.query.mockResolvedValueOnce({ rows: [] })

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          created_at: '2026-11-13',
          is_verified: false,
        },
      ],
    })

    await register(req, res)

    expect(bcrypt.hash).toHaveBeenCalledWith(
      'ExamplePassword123!',
      12
    )

    expect(pool.query).toHaveBeenCalledTimes(2)

    expect(generateVerificationToken).toHaveBeenCalledTimes(1)

    expect(sendVerificationEmail).toHaveBeenCalledWith(
      'test@example.com',
      'test-verification-token'
    )

    expect(res.status).toHaveBeenCalledWith(201)

    expect(res.json).toHaveBeenCalledWith({
      message:
        'Account created. Please check your email to verify your account.',
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2026-11-13',
        is_verified: false,
      },
    })
  })

  test('returns 503 when verification email delivery fails', async () => {
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

    pool.query.mockResolvedValueOnce({ rows: [] })

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          created_at: '2026-11-13',
          is_verified: false,
        },
      ],
    })

    sendVerificationEmail.mockRejectedValueOnce(
      new Error('Mail service unavailable')
    )

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      await register(req, res)

      expect(res.status).toHaveBeenCalledWith(503)

      expect(res.json).toHaveBeenCalledWith({
        message:
          'Account created, but the verification email could not be sent. Please try again later.',
      })
    } finally {
      consoleSpy.mockRestore()
    }
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

    pool.query.mockResolvedValueOnce({ rows: [] })

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
          is_verified: true,
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
          is_verified: true,
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

  test('returns 403 when the email has not been verified', async () => {
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
          is_verified: false,
        },
      ],
    })

    bcrypt.compare.mockResolvedValueOnce(true)

    await login(req, res)

    expect(res.status).toHaveBeenCalledWith(403)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Please verify your email before logging in.',
    })

    expect(jwt.sign).not.toHaveBeenCalled()
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

    pool.query.mockRejectedValueOnce(
      new Error('Database connection failed')
    )

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

// ========================================
// EMAIL VERIFICATION TESTS
// ========================================

describe('Auth Controller - Email Verification', () => {
  test('rejects a missing verification token', async () => {
    const req = { body: {} }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await verifyEmail(req, res)

    expect(res.status).toHaveBeenCalledWith(400)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Verification token is required.',
    })

    expect(pool.query).not.toHaveBeenCalled()
  })

  test('verifies an account using the token hash and expiry check', async () => {
    const token = 'test-verification-token'

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')

    const req = { body: { token } }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    const verifiedUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    }

    pool.query.mockResolvedValueOnce({
      rows: [verifiedUser],
    })

    await verifyEmail(req, res)

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'verification_token_expires_at > NOW()'
      ),
      [tokenHash]
    )

    expect(res.status).toHaveBeenCalledWith(200)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Email verified successfully. You can now log in.',
      user: verifiedUser,
    })
  })

  test('rejects invalid or expired verification tokens', async () => {
    const req = {
      body: {
        token: 'expired-token',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    pool.query.mockResolvedValueOnce({ rows: [] })

    await verifyEmail(req, res)

    expect(res.status).toHaveBeenCalledWith(400)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid or expired verification link.',
    })
  })
})

// ========================================
// RESEND VERIFICATION EMAIL TESTS
// ========================================

describe('Auth Controller - Resend Verification Email', () => {
  const genericMessage =
    'If an unverified account exists, a verification email will be sent.'

  test('rejects an invalid email address', async () => {
    const req = {
      body: {
        email: 'invalid-email',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await resendVerificationEmail(req, res)

    expect(res.status).toHaveBeenCalledWith(400)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Please provide a valid email address.',
    })

    expect(pool.query).not.toHaveBeenCalled()
  })

  test('rejects a missing email address', async () => {
    const req = {
      body: {},
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await resendVerificationEmail(req, res)

    expect(res.status).toHaveBeenCalledWith(400)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Please provide a valid email address.',
    })

    expect(pool.query).not.toHaveBeenCalled()
  })

  test('returns a generic response when the account does not exist', async () => {
    const req = {
      body: {
        email: 'unknown@example.com',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    pool.query.mockResolvedValueOnce({
      rows: [],
    })

    await resendVerificationEmail(req, res)

    expect(res.status).toHaveBeenCalledWith(200)

    expect(res.json).toHaveBeenCalledWith({
      message: genericMessage,
    })

    expect(generateVerificationToken).not.toHaveBeenCalled()

    expect(sendVerificationEmail).not.toHaveBeenCalled()
  })

  test('returns a generic response when the account is already verified', async () => {
    const req = {
      body: {
        email: 'test@example.com',
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
          is_verified: true,
        },
      ],
    })

    await resendVerificationEmail(req, res)

    expect(res.status).toHaveBeenCalledWith(200)

    expect(res.json).toHaveBeenCalledWith({
      message: genericMessage,
    })

    expect(generateVerificationToken).not.toHaveBeenCalled()

    expect(sendVerificationEmail).not.toHaveBeenCalled()
  })

  test('successfully resends a verification email to an unverified account', async () => {
    const req = {
      body: {
        email: '  TEST@example.com  ',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    // First query: find the unverified account.
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          is_verified: false,
        },
      ],
    })

    // Second query: save the new verification token.
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
        },
      ],
    })

    await resendVerificationEmail(req, res)

    expect(pool.query).toHaveBeenCalledTimes(2)

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT id, is_verified'),
      ['test@example.com']
    )

    expect(generateVerificationToken).toHaveBeenCalledTimes(1)

    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('verification_token_hash = $1'),
      [
        'test-token-hash',
        expect.any(Date),
        1,
      ]
    )

    expect(sendVerificationEmail).toHaveBeenCalledWith(
      'test@example.com',
      'test-verification-token'
    )

    expect(res.status).toHaveBeenCalledWith(200)

    expect(res.json).toHaveBeenCalledWith({
      message: genericMessage,
    })
  })

  test('returns 500 when the database query fails', async () => {
    const req = {
      body: {
        email: 'test@example.com',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    pool.query.mockRejectedValueOnce(
      new Error('Database connection failed')
    )

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      await resendVerificationEmail(req, res)

      expect(res.status).toHaveBeenCalledWith(500)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error.',
      })
    } finally {
      consoleSpy.mockRestore()
    }
  })

  test('returns a generic response when email delivery fails', async () => {
    const req = {
      body: {
        email: 'test@example.com',
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
          is_verified: false,
        },
      ],
    })

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
        },
      ],
    })

    sendVerificationEmail.mockRejectedValueOnce(
      new Error('Mail service unavailable')
    )

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      await resendVerificationEmail(req, res)

      expect(sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'test-verification-token'
      )

      expect(res.status).toHaveBeenCalledWith(200)

      expect(res.json).toHaveBeenCalledWith({
        message: genericMessage,
      })
    } finally {
      consoleSpy.mockRestore()
    }
  })
})