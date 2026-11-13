import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest, logout } from '../services/api'
import './Dashboard.css'

function Dashboard() {
  // Get the currently logged-in user.
  const navigate = useNavigate()

function handleLogout() {
  logout()
  navigate('/login', { replace: true })
}
  const user = JSON.parse(sessionStorage.getItem('user') || 'null')

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Planning')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const [editingProjectId, setEditingProjectId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState('Planning')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deletingProjectId, setDeletingProjectId] = useState(null)

  // Calculate project statistics.
  const projectStats = useMemo(() => {
    return {
      total: projects.length,

      inProgress: projects.filter(
        (project) => project.status === 'In Progress'
      ).length,

      completed: projects.filter(
        (project) => project.status === 'Completed'
      ).length,

      planning: projects.filter(
        (project) => project.status === 'Planning'
      ).length,
    }
  }, [projects])

  // Load projects belonging to the authenticated user.
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await apiRequest('/projects')
        setProjects(data.projects)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [])

  // Search and filter projects.
  const filteredProjects = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchText) ||
        (project.description || '').toLowerCase().includes(searchText)

      const matchesStatus =
        statusFilter === 'All' || project.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [projects, search, statusFilter])

  // Create a project.
  async function handleCreateProject(event) {
    event.preventDefault()

    setCreating(true)
    setFormError('')
    setSuccessMessage('')

    try {
      const data = await apiRequest('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          status,
        }),
      })

      setProjects((current) => [data.project, ...current])

      setName('')
      setDescription('')
      setStatus('Planning')
      setShowForm(false)

      setSuccessMessage('Project created successfully!')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // Open the edit form.
  function startEditing(project) {
    setEditingProjectId(project.id)
    setEditName(project.name)
    setEditDescription(project.description || '')
    setEditStatus(project.status)

    setFormError('')
    setSuccessMessage('')
  }

  // Cancel editing.
  function cancelEditing() {
    setEditingProjectId(null)
    setEditName('')
    setEditDescription('')
    setEditStatus('Planning')
    setFormError('')
  }

  // Update an existing project.
  async function handleUpdateProject(event, projectId) {
    event.preventDefault()

    setSavingEdit(true)
    setFormError('')
    setSuccessMessage('')

    try {
      const data = await apiRequest(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          status: editStatus,
        }),
      })

      setProjects((current) =>
        current.map((project) =>
          project.id === projectId ? data.project : project
        )
      )

      cancelEditing()
      setSuccessMessage('Project updated successfully!')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  // Delete a project after confirmation.
  async function handleDeleteProject(project) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setDeletingProjectId(project.id)
    setFormError('')
    setSuccessMessage('')

    try {
      await apiRequest(`/projects/${project.id}`, {
        method: 'DELETE',
      })

      setProjects((current) =>
        current.filter((item) => item.id !== project.id)
      )

      if (editingProjectId === project.id) {
        cancelEditing()
      }

      setSuccessMessage('Project deleted successfully!')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setDeletingProjectId(null)
    }
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name || 'there'} 👋</h1>
          <p>Here's what's happening with your work today.</p>
        </div>

        <div className="dashboard-header-actions">

  <button
    type="button"
    onClick={() => {
      setShowForm((current) => !current)
      setFormError('')
      setSuccessMessage('')
    }}
  >
    {showForm ? 'Cancel' : 'New Project'}
  </button>

  <button
    type="button"
    onClick={handleLogout}
    className="logout-button"
  >
    Logout
  </button>

</div>
      </header>

      {successMessage && (
        <p role="status" aria-live="polite">
          {successMessage}
        </p>
      )}

      {formError && (
        <p role="alert">
          {formError}
        </p>
      )}

      {/* Project statistics */}
      <section
        className="project-stats"
        aria-label="Project statistics"
      >
        <article className="stat-card">
          <p>Total Projects</p>
          <h2>{projectStats.total}</h2>
        </article>

        <article className="stat-card">
          <p>In Progress</p>
          <h2>{projectStats.inProgress}</h2>
        </article>

        <article className="stat-card">
          <p>Completed</p>
          <h2>{projectStats.completed}</h2>
        </article>

        <article className="stat-card">
          <p>Planning</p>
          <h2>{projectStats.planning}</h2>
        </article>
      </section>

      {/* Create project form */}
      {showForm && (
        <section className="recent-projects">
          <h2>Create a New Project</h2>

          <form onSubmit={handleCreateProject}>
            <div className="form-group">
              <label htmlFor="project-name">Project name</label>
              <input
                id="project-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={150}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-description">Description</label>
              <textarea
                id="project-description"
                name="description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-status">Status</label>
              <select
                id="project-status"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option>Planning</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </div>

            <button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </section>
      )}

      {/* Project list */}
      <section className="recent-projects">
        <div className="section-header">
          <h2>Recent Projects</h2>

          <span>
            {filteredProjects.length}{' '}
            {filteredProjects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        <div className="project-filters">
          <div className="form-group">
            <label htmlFor="project-search">Search projects</label>
            <input
              id="project-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or description..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="status-filter">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {loading && <p>Loading projects...</p>}

        {error && (
          <p role="alert">
            {error}
          </p>
        )}

        {!loading && !error && filteredProjects.length === 0 && (
          <p>No matching projects. Try a different search or status.</p>
        )}

        {!loading && !error && filteredProjects.length > 0 && (
          <div className="project-list">
            {filteredProjects.map((project) => (
              <article className="project-card" key={project.id}>
                {editingProjectId === project.id ? (
                  <form
                    onSubmit={(event) =>
                      handleUpdateProject(event, project.id)
                    }
                  >
                    <div className="form-group">
                      <label htmlFor={`edit-name-${project.id}`}>
                        Project name
                      </label>

                      <input
                        id={`edit-name-${project.id}`}
                        value={editName}
                        onChange={(event) =>
                          setEditName(event.target.value)
                        }
                        maxLength={150}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`edit-description-${project.id}`}>
                        Description
                      </label>

                      <textarea
                        id={`edit-description-${project.id}`}
                        value={editDescription}
                        onChange={(event) =>
                          setEditDescription(event.target.value)
                        }
                        rows={3}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`edit-status-${project.id}`}>
                        Status
                      </label>

                      <select
                        id={`edit-status-${project.id}`}
                        value={editStatus}
                        onChange={(event) =>
                          setEditStatus(event.target.value)
                        }
                      >
                        <option>Planning</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>
                    </div>

                    <button type="submit" disabled={savingEdit}>
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={savingEdit}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <h3>{project.name}</h3>

                    <p>
                      {project.description ||
                        'No description provided.'}
                    </p>

                    <span>{project.status}</span>

                    <div className="project-actions">
                      <button
                        type="button"
                        onClick={() => startEditing(project)}
                        disabled={deletingProjectId === project.id}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project)}
                        disabled={deletingProjectId === project.id}
                      >
                        {deletingProjectId === project.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default Dashboard