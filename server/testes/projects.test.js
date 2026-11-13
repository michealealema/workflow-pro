const request = require('supertest')
const app = require('../app')
const jwt = require('jsonwebtoken')

describe('Project authentication', () => {
  test('rejects access when no token is provided', async () => {
    const response = await request(app)
      .get('/api/projects')

    expect(response.status).toBe(401)

    expect(response.body).toEqual({
      message: 'Authentication required.',
    })
  })

  test('rejects access when an invalid token is provided', async () => {
    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer invalid-token')

    expect(response.status).toBe(401)

    expect(response.body).toEqual({
      message: 'Invalid or expired token.',
    })
  })

  test('rejects access when an expired token is provided', async () => {
    const expiredToken = jwt.sign(
      { id: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    )

    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${expiredToken}`)

    expect(response.status).toBe(401)

    expect(response.body).toEqual({
      message: 'Invalid or expired token.',
    })
  })
  test('rejects an authorization header with the wrong scheme', async () => {
  const response = await request(app)
    .get('/api/projects')
    .set('Authorization', 'Basic some-token')

  expect(response.status).toBe(401)

  expect(response.body).toEqual({
    message: 'Invalid authorization header.',
  })
})
})