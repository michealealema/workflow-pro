const API_URL = 'http://localhost:5000/api'

export async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong.')
  }

  return data
}

export function logout() {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}