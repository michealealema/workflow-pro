import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest } from '../services/api'
import './ProjectDetails.css'

const STATUSES = [
  'To Do',
  'In Progress',
  'In Review',
  'Completed',
]

const PRIORITIES = ['Low', 'Medium', 'High']

const INITIAL_FORM = {
  title: '',
  description: '',
  status: 'To Do',
  priority: 'Medium',
  start_date: '',
  due_date: '',
  assigned_to: '',
}

function ProjectDetails() {
  const { projectId } = useParams()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])

  // Task comments
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [commentLoading, setCommentLoading] = useState({})
  const [commentsOpen, setCommentsOpen] = useState({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [managingMembers, setManagingMembers] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState(INITIAL_FORM)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [draggedTaskId, setDraggedTaskId] = useState(null)

  const [memberEmail, setMemberEmail] = useState('')

  // Get the logged-in user from the browser session.
  let currentUser = null

  try {
    currentUser = JSON.parse(
      sessionStorage.getItem('user') || 'null'
    )
  } catch {
    currentUser = null
  }

  // Only the project owner can manage team members.
  const isProjectOwner =
    project &&
    currentUser &&
    String(project.user_id) === String(currentUser.id)

  // Load project information, tasks, and team members.
  const loadProjectDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [
        projectData,
        taskData,
        memberData,
      ] = await Promise.all([
        apiRequest('/projects'),
        apiRequest(`/projects/${projectId}/tasks`),
        apiRequest(`/projects/${projectId}/members`),
      ])

      const projectList = Array.isArray(projectData)
        ? projectData
        : projectData.projects || projectData.project || []

      const foundProject = projectList.find(
        (item) => String(item.id) === String(projectId)
      )

      if (!foundProject) {
        throw new Error('Project not found.')
      }

      const taskList = Array.isArray(taskData)
        ? taskData
        : taskData.tasks || taskData.task || []

      const memberList = Array.isArray(memberData)
        ? memberData
        : memberData.members || []

      setProject(foundProject)
      setTasks(Array.isArray(taskList) ? taskList : [])
      setMembers(Array.isArray(memberList) ? memberList : [])

      // Reset comments when loading a different project.
      setComments({})
      setCommentsOpen({})
    } catch (err) {
      setError(err.message || 'Failed to load project.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Initial project loading.
  useEffect(() => {
    let isMounted = true

    async function initialLoad() {
      try {
        const [
          projectData,
          taskData,
          memberData,
        ] = await Promise.all([
          apiRequest('/projects'),
          apiRequest(`/projects/${projectId}/tasks`),
          apiRequest(`/projects/${projectId}/members`),
        ])

        if (!isMounted) return

        const projectList = Array.isArray(projectData)
          ? projectData
          : projectData.projects || projectData.project || []

        const foundProject = projectList.find(
          (item) => String(item.id) === String(projectId)
        )

        if (!foundProject) {
          throw new Error('Project not found.')
        }

        const taskList = Array.isArray(taskData)
          ? taskData
          : taskData.tasks || taskData.task || []

        const memberList = Array.isArray(memberData)
          ? memberData
          : memberData.members || []

        setProject(foundProject)
        setTasks(Array.isArray(taskList) ? taskList : [])
        setMembers(Array.isArray(memberList) ? memberList : [])

        // Reset comments when loading a different project.
        setComments({})
        setCommentsOpen({})
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load project.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initialLoad()

    return () => {
      isMounted = false
    }
  }, [projectId])

  // Load comments belonging to a task.
  async function loadTaskComments(taskId) {
    try {
      const data = await apiRequest(
        `/tasks/${taskId}/comments`
      )

      setComments((previous) => ({
        ...previous,
        [taskId]: Array.isArray(data.comments)
          ? data.comments
          : [],
      }))
    } catch (err) {
      setError(err.message || 'Failed to load comments.')
    }
  }

  // Open or close a task's comments section.
  function toggleComments(taskId) {
    const isCurrentlyOpen = commentsOpen[taskId]

    setCommentsOpen((previous) => ({
      ...previous,
      [taskId]: !previous[taskId],
    }))

    // Fetch comments the first time the section is opened.
    if (
      !isCurrentlyOpen &&
      !Object.prototype.hasOwnProperty.call(comments, taskId)
    ) {
      loadTaskComments(taskId)
    }
  }

  // Handle comment input changes.
  function handleCommentChange(taskId, value) {
    setCommentInputs((previous) => ({
      ...previous,
      [taskId]: value,
    }))
  }

  // Create a new task comment.
  async function handleAddComment(event, taskId) {
    event.preventDefault()

    const content = (commentInputs[taskId] || '').trim()

    if (!content) {
      setError('Comment cannot be empty.')
      return
    }

    if (content.length > 5000) {
      setError('Comment must be 5000 characters or fewer.')
      return
    }

    try {
      setCommentLoading((previous) => ({
        ...previous,
        [taskId]: true,
      }))

      setError('')
      setSuccess('')

      const data = await apiRequest(
        `/tasks/${taskId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        }
      )

      if (!data.comment) {
        throw new Error('Comment was not returned by the server.')
      }

      // Add the newly created comment to the local state.
      const newComment = {
        ...data.comment,
        author_name: currentUser?.name || 'You',
      }

      setComments((previous) => ({
        ...previous,
        [taskId]: [
          ...(previous[taskId] || []),
          newComment,
        ],
      }))

      // Clear the input after successful submission.
      setCommentInputs((previous) => ({
        ...previous,
        [taskId]: '',
      }))

      setSuccess('Comment added successfully.')
    } catch (err) {
      setError(err.message || 'Failed to add comment.')
    } finally {
      setCommentLoading((previous) => ({
        ...previous,
        [taskId]: false,
      }))
    }
  }

  // Handle task form input changes.
  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // Create or update a task.
  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      if (!form.title.trim()) {
        setError('Task title is required.')
        return
      }

      const taskData = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        assigned_to: form.assigned_to
          ? Number(form.assigned_to)
          : null,
      }

      if (editingTaskId) {
        await apiRequest(`/tasks/${editingTaskId}`, {
          method: 'PUT',
          body: JSON.stringify(taskData),
        })

        setSuccess('Task updated successfully.')
      } else {
        await apiRequest(`/projects/${projectId}/tasks`, {
          method: 'POST',
          body: JSON.stringify(taskData),
        })

        setSuccess('Task created successfully.')
      }

      setForm(INITIAL_FORM)
      setEditingTaskId(null)

      await loadProjectDetails()
    } catch (err) {
      setError(err.message || 'Failed to save task.')
    } finally {
      setSaving(false)
    }
  }

  // Load an existing task into the form.
  function handleEdit(task) {
    setEditingTaskId(task.id)

    setForm({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'To Do',
      priority: task.priority || 'Medium',

      start_date: task.start_date
        ? String(task.start_date).slice(0, 10)
        : '',

      due_date: task.due_date
        ? String(task.due_date).slice(0, 10)
        : '',

      assigned_to: task.assigned_to
        ? String(task.assigned_to)
        : '',
    })

    setError('')
    setSuccess('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  // Cancel task editing.
  function cancelEdit() {
    setEditingTaskId(null)
    setForm(INITIAL_FORM)
    setError('')
    setSuccess('')
  }

  // Delete a task.
  async function handleDelete(taskId) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this task?'
    )

    if (!confirmed) return

    try {
      setError('')
      setSuccess('')

      await apiRequest(`/tasks/${taskId}`, {
        method: 'DELETE',
      })

      setTasks((previous) =>
        previous.filter(
          (task) => String(task.id) !== String(taskId)
        )
      )

      setSuccess('Task deleted successfully.')

      if (String(editingTaskId) === String(taskId)) {
        cancelEdit()
      }
    } catch (err) {
      setError(err.message || 'Failed to delete task.')
    }
  }

  // Update a task's status.
  async function updateTaskStatus(taskId, newStatus) {
    const originalTasks = tasks

    const task = tasks.find(
      (item) => String(item.id) === String(taskId)
    )

    if (!task || task.status === newStatus) return

    try {
      setError('')
      setSuccess('')

      setTasks((previous) =>
        previous.map((item) =>
          String(item.id) === String(taskId)
            ? { ...item, status: newStatus }
            : item
        )
      )

      await apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      setSuccess(`Task moved to ${newStatus}.`)
    } catch (err) {
      setTasks(originalTasks)
      setError(err.message || 'Could not update task status.')
    }
  }

  // Start dragging a task.
  function handleDragStart(event, taskId) {
    setDraggedTaskId(taskId)

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(taskId))
  }

  // Allow tasks to be dropped into another column.
  function handleDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  // Move a task to another status column.
  async function handleDrop(event, newStatus) {
    event.preventDefault()

    const taskId =
      event.dataTransfer.getData('text/plain') || draggedTaskId

    if (!taskId) return

    await updateTaskStatus(taskId, newStatus)

    setDraggedTaskId(null)
  }

  function handleDragEnd() {
    setDraggedTaskId(null)
  }

  // Add a team member using their email.
  async function handleAddMember(event) {
    event.preventDefault()

    if (!memberEmail.trim()) {
      setError('Please enter a member email address.')
      return
    }

    try {
      setManagingMembers(true)
      setError('')
      setSuccess('')

      await apiRequest(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: memberEmail.trim(),
        }),
      })

      setMemberEmail('')
      setSuccess('Team member added successfully.')

      await loadProjectDetails()
    } catch (err) {
      setError(err.message || 'Failed to add team member.')
    } finally {
      setManagingMembers(false)
    }
  }

  // Remove a team member.
  async function handleRemoveMember(userId) {
    const confirmed = window.confirm(
      'Are you sure you want to remove this team member?'
    )

    if (!confirmed) return

    try {
      setManagingMembers(true)
      setError('')
      setSuccess('')

      await apiRequest(
        `/projects/${projectId}/members/${userId}`,
        {
          method: 'DELETE',
        }
      )

      setSuccess('Team member removed successfully.')

      await loadProjectDetails()
    } catch (err) {
      setError(err.message || 'Failed to remove team member.')
    } finally {
      setManagingMembers(false)
    }
  }

  const completedTasks = tasks.filter(
    (task) => task.status === 'Completed'
  ).length

  const progress = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0

  const todoCount = tasks.filter(
    (task) => task.status === 'To Do'
  ).length

  const inProgressCount = tasks.filter(
    (task) => task.status === 'In Progress'
  ).length

  if (loading) {
    return (
      <main className="project-details-page">
        <div className="details-container details-loading">
          Loading project...
        </div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="project-details-page">
        <div className="details-container">
          <p className="details-alert error-alert">
            {error || 'Project not found.'}
          </p>

          <Link to="/dashboard" className="back-link">
            Back to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="project-details-page">
      <div className="details-container">

        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>

        {/* Project information */}
        <section className="project-details-header">
          <div>
            <span className="details-label">
              PROJECT DETAILS
            </span>

            <h1>{project.name || project.title}</h1>

            <p>
              {project.description || 'No description available.'}
            </p>
          </div>

          <span className="project-status">
            {project.status || 'Active'}
          </span>
        </section>

        {/* General alerts */}
        {error && (
          <div className="details-alert error-alert">
            {error}
          </div>
        )}

        {success && (
          <div className="details-alert success-alert">
            {success}
          </div>
        )}

        {/* Team collaboration */}
        <section className="team-section">
          <div className="tasks-heading">
            <div>
              <span className="details-label">
                COLLABORATION
              </span>

              <h2>Project Team</h2>
            </div>

            <span className="task-count">
              {members.length} members
            </span>
          </div>

          {isProjectOwner && (
            <form
              onSubmit={handleAddMember}
              className="add-member-form"
            >
              <div className="task-form-group">
                <label htmlFor="memberEmail">
                  Invite a team member by email
                </label>

                <input
                  id="memberEmail"
                  type="email"
                  value={memberEmail}
                  onChange={(event) =>
                    setMemberEmail(event.target.value)
                  }
                  placeholder="Enter registered user email"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={managingMembers}
              >
                {managingMembers ? 'Adding...' : 'Add Member'}
              </button>
            </form>
          )}

          <div className="team-members-list">
            {members.length === 0 ? (
              <p className="team-empty">
                No team members yet.
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.user_id || member.id}
                  className="team-member-card"
                >
                  <div className="team-member-avatar">
                    {(member.name || member.email || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="team-member-info">
                    <strong>
                      {member.name || 'Unnamed member'}
                    </strong>

                    <span>{member.email}</span>

                    <small>
                      {member.role || 'Member'}
                    </small>
                  </div>

                  {isProjectOwner &&
                    String(member.user_id) !==
                      String(currentUser.id) && (
                      <button
                        type="button"
                        className="remove-member-button"
                        disabled={managingMembers}
                        onClick={() =>
                          handleRemoveMember(member.user_id)
                        }
                      >
                        Remove
                      </button>
                    )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Task statistics */}
        <section className="task-statistics">
          <div className="task-stat-card">
            <span>Total Tasks</span>
            <strong>{tasks.length}</strong>
          </div>

          <div className="task-stat-card">
            <span>To Do</span>
            <strong>{todoCount}</strong>
          </div>

          <div className="task-stat-card">
            <span>In Progress</span>
            <strong>{inProgressCount}</strong>
          </div>

          <div className="task-stat-card">
            <span>Completed</span>
            <strong>{completedTasks}</strong>
          </div>
        </section>

        {/* Project progress */}
        <section className="task-progress-section">
          <div className="progress-heading">
            <h2>Project Progress</h2>
            <span>{progress}%</span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {/* Create and edit tasks */}
        <section className="task-form-section">
          <h2>
            {editingTaskId ? 'Edit Task' : 'Create New Task'}
          </h2>

          <form onSubmit={handleSubmit} className="task-form">

            <div className="task-form-group">
              <label htmlFor="title">Task Title</label>

              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter task title"
                required
              />
            </div>

            <div className="task-form-group">
              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the task"
                rows="3"
              />
            </div>

            <div className="task-form-row">

              <div className="task-form-group">
                <label htmlFor="status">Status</label>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="task-form-group">
                <label htmlFor="priority">Priority</label>

                <select
                  id="priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div className="task-form-group">
                <label htmlFor="start_date">Start Date</label>

                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange}
                />
              </div>

              <div className="task-form-group">
                <label htmlFor="due_date">Due Date</label>

                <input
                  id="due_date"
                  name="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={handleChange}
                />
              </div>

            </div>

            {/* Task assignee */}
            <div className="task-form-group">
              <label htmlFor="assigned_to">
                Assign Task To
              </label>

              <select
                id="assigned_to"
                name="assigned_to"
                value={form.assigned_to}
                onChange={handleChange}
              >
                <option value="">Unassigned</option>

                {members.map((member) => (
                  <option
                    key={member.user_id || member.id}
                    value={member.user_id}
                  >
                    {member.name || member.email}
                  </option>
                ))}
              </select>

              <small>
                Select a project team member or leave unassigned.
              </small>
            </div>

            <div className="task-form-actions">
              <button type="submit" disabled={saving}>
                {saving
                  ? 'Saving...'
                  : editingTaskId
                    ? 'Update Task'
                    : 'Create Task'}
              </button>

              {editingTaskId && (
                <button
                  type="button"
                  className="cancel-task-button"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>

          </form>
        </section>

        {/* Kanban Board */}
        <section className="kanban-section">

          <div className="tasks-heading">
            <div>
              <span className="details-label">
                TASK MANAGEMENT
              </span>

              <h2>Kanban Board</h2>
            </div>

            <span className="task-count">
              {tasks.length} tasks
            </span>
          </div>

          <p className="kanban-instructions">
            Drag and drop tasks between columns to update their status.
          </p>

          <div className="kanban-board">

            {STATUSES.map((status) => {
              const columnTasks = tasks.filter(
                (task) => task.status === status
              )

              const statusClass = status
                .toLowerCase()
                .replaceAll(' ', '-')

              return (
                <div
                  key={status}
                  className={`kanban-column kanban-${statusClass}`}
                  onDragOver={handleDragOver}
                  onDrop={(event) => handleDrop(event, status)}
                >

                  <div className="kanban-column-header">
                    <h3>{status}</h3>
                    <span>{columnTasks.length}</span>
                  </div>

                  <div className="kanban-column-content">

                    {columnTasks.length === 0 && (
                      <div className="kanban-empty">
                        Drop tasks here
                      </div>
                    )}

                    {columnTasks.map((task) => (
                      <article
                        key={task.id}
                        className={`kanban-task-card ${
                          draggedTaskId === task.id
                            ? 'dragging'
                            : ''
                        }`}
                        draggable
                        onDragStart={(event) =>
                          handleDragStart(event, task.id)
                        }
                        onDragEnd={handleDragEnd}
                      >

                        <div className="kanban-task-top">
                          <span
                            className={`task-priority priority-${(
                              task.priority || 'Medium'
                            ).toLowerCase()}`}
                          >
                            {task.priority || 'Medium'}
                          </span>

                          <span className="drag-indicator">
                            ⠿
                          </span>
                        </div>

                        <h4>{task.title}</h4>

                        <p>
                          {task.description ||
                            'No description provided.'}
                        </p>

                        {/* Assigned team member */}
                        <div className="task-assignee">
                          <span>Assigned to:</span>

                          <strong>
                            {task.assignee_name ||
                              task.assignee_email ||
                              'Unassigned'}
                          </strong>
                        </div>

                        <div className="kanban-task-dates">
                          Due:{' '}
                          {task.due_date
                            ? String(task.due_date).slice(0, 10)
                            : 'Not set'}
                        </div>

                        <div className="kanban-task-actions">
                          <button
                            type="button"
                            onClick={() => handleEdit(task)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-task-button"
                            onClick={() => handleDelete(task.id)}
                          >
                            Delete
                          </button>
                        </div>

                        {/* Task Comments */}
                        <div className="task-comments-section">

                          <button
                            type="button"
                            className="comments-toggle-button"
                            onClick={() => toggleComments(task.id)}
                          >
                            {commentsOpen[task.id]
                              ? 'Hide Comments'
                              : `Comments ${
                                  comments[task.id]
                                    ? `(${comments[task.id].length})`
                                    : ''
                                }`}
                          </button>

                          {commentsOpen[task.id] && (
                            <div className="task-comments-content">

                              <h5>Task Discussion</h5>

                              {!Object.prototype.hasOwnProperty.call(
                                comments,
                                task.id
                              ) ? (
                                <p>Loading comments...</p>
                              ) : comments[task.id].length === 0 ? (
                                <p className="comments-empty">
                                  No comments yet. Start the discussion!
                                </p>
                              ) : (
                                <div className="comments-list">
                                  {comments[task.id].map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="comment-card"
                                    >
                                      <div className="comment-header">
                                        <strong>
                                          {comment.author_name || 'User'}
                                        </strong>

                                        <small>
                                          {comment.created_at
                                            ? new Date(
                                                comment.created_at
                                              ).toLocaleString()
                                            : ''}
                                        </small>
                                      </div>

                                      <p>{comment.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <form
                                className="comment-form"
                                onSubmit={(event) =>
                                  handleAddComment(event, task.id)
                                }
                              >
                                <textarea
                                  value={commentInputs[task.id] || ''}
                                  onChange={(event) =>
                                    handleCommentChange(
                                      task.id,
                                      event.target.value
                                    )
                                  }
                                  placeholder="Write a comment..."
                                  rows="2"
                                  maxLength={5000}
                                  required
                                />

                                <button
                                  type="submit"
                                  disabled={commentLoading[task.id]}
                                >
                                  {commentLoading[task.id]
                                    ? 'Posting...'
                                    : 'Post Comment'}
                                </button>
                              </form>

                            </div>
                          )}

                        </div>

                      </article>
                    ))}

                  </div>
                </div>
              )
            })}

          </div>
        </section>

      </div>
    </main>
  )
}

export default ProjectDetails