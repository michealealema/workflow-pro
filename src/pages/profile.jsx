import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest, logout } from '../services/api'

function Profile() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await apiRequest('/profile')
        setProfile(data.user)
      } catch (error) {
        setError(error.message)
      }
    }

    loadProfile()
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (error) {
    return (
      <div>
        <h1>My Profile</h1>
        <p>{error}</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div>
        <h1>My Profile</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <h1>My Profile</h1>

      <p>
        <strong>Name:</strong> {profile.name}
      </p>

      <p>
        <strong>Email:</strong> {profile.email}
      </p>

      <p>
        <strong>User ID:</strong> {profile.id}
      </p>

      <p>
        <strong>Member since:</strong>{' '}
        {new Date(profile.created_at).toLocaleDateString()}
      </p>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  )
}

export default Profile