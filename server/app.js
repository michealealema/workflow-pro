require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')

const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const projectRoutes = require('./routes/projectRoutes')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// Security headers
app.use(helmet())

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
]

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

// Parse incoming JSON requests with a 10 KB size limit
app.use(express.json({ limit: '10kb' }))

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    message: 'WorkFlow Pro API is running!',
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api', userRoutes)
app.use('/api/projects', projectRoutes)

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found.',
  })
})

// Centralized error handling
app.use(errorHandler)

module.exports = app