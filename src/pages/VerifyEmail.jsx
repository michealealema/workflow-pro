import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../services/api'

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState('Verifying your email...')
  const [verified, setVerified] = useState(false)
  const verificationStarted = useRef(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (verificationStarted.current) {
      return
    }

    verificationStarted.current = true

    async function verify() {
      if (!token) {
        setMessage('Verification token is missing.')
        return
      }

      try {
        const data = await apiRequest('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        })

        setMessage(data.message || 'Email verified successfully.')
        setVerified(true)
      } catch (error) {
        console.error('Email verification error:', error)
        setMessage(error.message || 'Unable to verify your email.')
      }
    }

    verify()
  }, [token])

  return (
    <main className="login-page">
      <section className="login-card">
        <Link to="/" className="login-brand">
          WorkFlow Pro
        </Link>

        <div className="login-heading">
          <h1>Email verification</h1>
          <p role={verified ? 'status' : 'alert'}>{message}</p>
        </div>

        {verified && (
          <Link to="/login" className="login-submit">
            Go to login
          </Link>
        )}
      </section>
    </main>
  )
}

export default VerifyEmail