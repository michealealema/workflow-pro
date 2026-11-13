const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../config/database', () => ({
  query: jest.fn(),
}))

const app = require('../app')
const pool = require('../config/database')

describe('User profile route', () => {
  let token

  beforeEach(() => {
    jest.clearAllMocks()

    token = jwt.sign(
      {
        id: 1,
        email: 'test@example.com',
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )
  })

  test('rejects access when no token is provided', async () => {
    const response = await request(app)
      .get('/api/profile')

    expect(response.status).toBe(401)

    expect(response.body).toEqual({
      message: 'Authentication required.',
    })

    expect(pool.query).not.toHaveBeenCalled()
  })

  test('returns the authenticated user profile', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      created_at: '2026-11-12T10:00:00.000Z',
    }

    pool.query.mockResolvedValue({
      rows: [mockUser],
    })

    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)

    expect(response.body).toEqual({
      message: 'You accessed a protected route!',
      user: mockUser,
    })

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [1]
    )
  })

  test('returns 404 when the authenticated user does not exist', async () => {
    pool.query.mockResolvedValue({
      rows: [],
    })

    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(404)

    expect(response.body).toEqual({
      message: 'User not found.',
    })
  })

  test('returns 500 when the database query fails', async () => {
    pool.query.mockRejectedValue(
      new Error('Database connection failed')
    )

    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(500)

    expect(response.body).toEqual({
      message: 'Server error.',
    })
  })
})