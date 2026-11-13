require('dotenv').config()

const app = require('./app')
const pool = require('./config/database')

const PORT = process.env.PORT || 5000

// Verify required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is missing. Check your environment configuration.'
  )
}

async function startServer() {
  try {
    // Verify database connection before starting the server
    await pool.query('SELECT NOW()')

    console.log('Database connected successfully!')

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })

    let isShuttingDown = false

    // Graceful shutdown
    const shutdown = (signal) => {
      if (isShuttingDown) {
        return
      }

      isShuttingDown = true

      console.log(`Received ${signal}. Shutting down server...`)

      // Allow 10 seconds for shutdown
      const shutdownTimer = setTimeout(() => {
        console.error(
          'Graceful shutdown timed out. Closing active connections.'
        )

        server.closeAllConnections()
        process.exit(1)
      }, 10000)

      // Stop accepting new requests
      server.close(async (serverError) => {
        let exitCode = 0

        // Handle HTTP server shutdown errors
        if (
          serverError &&
          serverError.code !== 'ERR_SERVER_NOT_RUNNING'
        ) {
          console.error(
            'Error closing HTTP server:',
            serverError.message
          )

          exitCode = 1
        }

        // Close PostgreSQL connection pool
        try {
          await pool.end()

          console.log('Database connection pool closed.')
        } catch (error) {
          console.error(
            'Error closing database pool:',
            error.message
          )

          exitCode = 1
        }

        // Clear shutdown timeout
        clearTimeout(shutdownTimer)

        console.log('Server shutdown completed.')

        process.exitCode = exitCode
      })
    }

    // Handle termination signals
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

  } catch (error) {
    console.error('Unable to start server.')
    console.error(error.message)

    try {
      await pool.end()
    } catch (poolError) {
      console.error(
        'Error closing database pool:',
        poolError.message
      )
    }

    process.exitCode = 1
  }
}

startServer()