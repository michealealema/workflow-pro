const express = require('express')
const request = require('supertest')
const errorHandler = require('../middleware/errorHandler')

describe('Error handling middleware', () => {
  let app

  beforeEach(() => {
    app = express()

    // Route that deliberately creates an internal error
    app.get('/internal-error', (req, res, next) => {
      const error = new Error('database password is secret')
      next(error)
    })

    // Route that deliberately creates a client error
    app.get('/client-error', (req, res, next) => {
      const error = new Error('Invalid input.')
      error.status = 400
      next(error)
    })

    app.use(errorHandler)
  })

  test('returns 500 for unexpected server errors', async () => {
    const response = await request(app)
      .get('/internal-error')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      message: 'Internal server error.',
    })
  })

  test('does not expose internal error details', async () => {
    const response = await request(app)
      .get('/internal-error')

    expect(response.body.message)
      .not.toContain('database password')
  })

  test('returns the correct status and message for client errors', async () => {
    const response = await request(app)
      .get('/client-error')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      message: 'Invalid request.',
    })
  })

  test('passes errors to the next handler if headers were already sent', () => {
    const error = new Error('Test error')
    const next = jest.fn()

    const req = {}
    const res = {
      headersSent: true,
    }

    errorHandler(error, req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})