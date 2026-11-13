require('dotenv').config()

const jwt = require('jsonwebtoken')
const authMiddleware = require('../middleware/authMiddleware')

describe('Authentication middleware', () => {

  // =====================================
  // VALID TOKEN
  // =====================================

  test('accepts a valid Bearer token', () => {
    const token = jwt.sign(
      { id: 1, email: 'test@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(req.user.id).toBe(1)
    expect(req.user.email).toBe('test@example.com')
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  // =====================================
  // MISSING TOKEN
  // =====================================

  test('rejects a request with no authorization header', () => {
    const req = {
      headers: {},
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Authentication required.',
    })

    expect(next).not.toHaveBeenCalled()
  })

  // =====================================
  // INVALID TOKEN
  // =====================================

  test('rejects an invalid token', () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid or expired token.',
    })

    expect(next).not.toHaveBeenCalled()
  })

  // =====================================
  // EXPIRED TOKEN
  // =====================================

  test('rejects an expired token', () => {
    const token = jwt.sign(
      { id: 1, email: 'test@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    )

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid or expired token.',
    })

    expect(next).not.toHaveBeenCalled()
  })

  // =====================================
  // MALFORMED AUTHORIZATION HEADERS
  // =====================================

  test('rejects an authorization header with an incorrect scheme', () => {
    const req = {
      headers: {
        authorization: 'Basic abc123',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid authorization header.',
    })

    expect(next).not.toHaveBeenCalled()
  })

  test('rejects a Bearer header without a token', () => {
    const req = {
      headers: {
        authorization: 'Bearer',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid authorization header.',
    })

    expect(next).not.toHaveBeenCalled()
  })

  test('rejects an authorization header containing extra parts', () => {
    const req = {
      headers: {
        authorization: 'Bearer token extra',
      },
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)

    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid authorization header.',
    })

    expect(next).not.toHaveBeenCalled()
  })

})