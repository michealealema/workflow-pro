function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error)
  }

  console.error('API Error:', error)

  const statusCode = error.statusCode || error.status || 500

  let message = 'Internal server error.'

  if (statusCode < 500) {
    message = statusCode === 400
      ? 'Invalid request.'
      : error.message
  }

  res.status(statusCode).json({ message })
}

module.exports = errorHandler