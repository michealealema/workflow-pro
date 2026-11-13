const express = require('express')
const request = require('supertest')
const rateLimit = require('express-rate-limit')

describe('Login rate limiter', () => {
  test('blocks the sixth failed login attempt', async () => {
    const app = express()

    app.use(express.json())

    const loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skipSuccessfulRequests: true,
    })

    app.post('/login', loginLimiter, (req, res) => {
      res.status(401).json({
        message: 'Invalid credentials.',
      })
    })

    // First five attempts should reach the login handler.
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        })

      expect(response.status).toBe(401)
    }

    // The sixth attempt should be blocked.
    const response = await request(app)
      .post('/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      })

    expect(response.status).toBe(429)
  })
})