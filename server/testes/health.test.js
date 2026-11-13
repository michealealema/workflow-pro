const request = require('supertest')
const app = require('../app')

describe('GET /api/health', () => {
  test('returns a successful response and API message', async () => {
    const response = await request(app)
      .get('/api/health')

    expect(response.status).toBe(200)

    expect(response.body).toEqual({
      message: 'WorkFlow Pro API is running!',
    })
  })

  test('includes Helmet security headers', async () => {
    const response = await request(app)
      .get('/api/health')

    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(response.headers['content-security-policy']).toBeDefined()
  })

  test('allows requests from the configured frontend origin', async () => {
    const allowedOrigin =
      process.env.CLIENT_URL || 'http://localhost:5173'

    const response = await request(app)
      .get('/api/health')
      .set('Origin', allowedOrigin)

    expect(response.headers['access-control-allow-origin'])
      .toBe(allowedOrigin)
  })

  test('does not allow requests from an unapproved origin', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://example.com')

    expect(response.headers['access-control-allow-origin'])
      .toBeUndefined()
  })
})

describe('API error handling', () => {
  test('returns 404 for an unknown route', async () => {
    const response = await request(app)
      .get('/api/this-route-does-not-exist')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      message: 'Route not found.',
    })
  })

  test('returns a generic 500 error without exposing internal details', async () => {
    const response = await request(app)
      .get('/api/test-internal-error')

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('Route not found.')
    expect(response.body.message).not.toContain('database password')
  })
})