const request = require('supertest')
const app = require('../app')

describe('POST /api/auth/login', () => {
  test('rejects login when credentials are missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({})

    expect(response.status).toBe(400)

    expect(response.body).toEqual({
      message: 'Email and password are required.',
    })
  })

  test('rejects login when password is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
      })

    expect(response.status).toBe(400)

    expect(response.body).toEqual({
      message: 'Email and password are required.',
    })
  })

  test('rejects login when email is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        password: 'ExamplePassword123!',
      })

    expect(response.status).toBe(400)

    expect(response.body).toEqual({
      message: 'Email and password are required.',
    })
  })

  test('rejects login with incorrect credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent-user@example.com',
        password: 'WrongPassword123!',
      })

    expect(response.status).toBe(401)
  })
})

describe('POST /api/auth/register', () => {
  test('rejects passwords shorter than 8 characters', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: `shortpassword-${Date.now()}@example.com`,
        password: '1234567',
      })

    expect(response.status).toBe(400)

    expect(response.body).toEqual({
      message: 'Password must be at least 8 characters long.',
    })
  })
})