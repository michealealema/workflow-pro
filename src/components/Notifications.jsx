import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  // Load notifications from the backend.
  async function loadNotifications() {
    try {
      const data = await apiRequest('/notifications')

      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : []
      )
      setUnreadCount(data.unreadCount ?? 0)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  // Load notifications when the component mounts.
  useEffect(() => {
    let isMounted = true

    apiRequest('/notifications')
      .then((data) => {
        if (isMounted) {
          setNotifications(
            Array.isArray(data.notifications) ? data.notifications : []
          )
          setUnreadCount(data.unreadCount ?? 0)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load notifications.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Mark one notification as read.
  async function markAsRead(notificationId) {
    setUpdating(true)
    setError('')

    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })

      await loadNotifications()
    } catch (err) {
      setError(err.message || 'Failed to update notification.')
    } finally {
      setUpdating(false)
    }
  }

  // Mark all notifications as read.
  async function markAllAsRead() {
    setUpdating(true)
    setError('')

    try {
      await apiRequest('/notifications/read-all', {
        method: 'PATCH',
      })

      await loadNotifications()
    } catch (err) {
      setError(err.message || 'Failed to update notifications.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="notification-container">
      <button
        type="button"
        className="notification-bell"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">🔔</span>

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          className="notification-dropdown"
          aria-label="Notifications"
        >
          <div className="notification-header">
            <h2>Notifications</h2>

            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-all-button"
                onClick={markAllAsRead}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Mark all as read'}
              </button>
            )}
          </div>

          {error && (
            <p className="notification-error" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="notification-empty">
              Loading notifications...
            </p>
          ) : notifications.length === 0 ? (
            <p className="notification-empty">
              You're all caught up. No notifications yet.
            </p>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-item ${
                    notification.is_read ? 'read' : 'unread'
                  }`}
                >
                  <div className="notification-content">
                    <p>{notification.message}</p>

                    <small>
                      {notification.actor_name || 'WorkFlow Pro'} ·{' '}
                      {new Date(
                        notification.created_at
                      ).toLocaleString()}
                    </small>
                  </div>

                  {!notification.is_read && (
                    <button
                      type="button"
                      className="mark-read-button"
                      onClick={() => markAsRead(notification.id)}
                      disabled={updating}
                      aria-label="Mark notification as read"
                    >
                      Mark read
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default Notifications
