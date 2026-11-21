jest.mock('../config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

jest.mock('../services/notificationService', () => ({
  createNotification: jest.fn(),
}))

const pool = require('../config/database')
const {
  createNotification,
} = require('../services/notificationService')

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
}

const {
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController')

describe('Task Controller', () => {
  let req
  let res
  let next

  beforeEach(() => {
    jest.clearAllMocks()

    mockClient.query.mockReset()
    mockClient.release.mockReset()

    pool.connect.mockResolvedValue(mockClient)
    createNotification.mockResolvedValue({ id: 1 })

    req = {
      params: {},
      body: {},
      user: { id: 1 },
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    next = jest.fn()
  })

  // =====================================
  // GET PROJECT TASKS
  // =====================================

  describe('getProjectTasks', () => {
    test('should return project tasks', async () => {
      const tasks = [
        {
          id: 1,
          project_id: 10,
          title: 'Build authentication',
          status: 'In Progress',
          priority: 'High',
          assigned_to: 2,
          assignee_name: 'Zemen',
        },
      ]

      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: tasks })

      req.params = { projectId: '10' }

      await getProjectTasks(req, res, next)

      expect(pool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('user_id = $2'),
        [10, 1]
      )

      expect(pool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LEFT JOIN users'),
        [10]
      )

      expect(res.json).toHaveBeenCalledWith({ tasks })
    })

    test('should return 404 when project is inaccessible', async () => {
      req.params = { projectId: '10' }

      pool.query.mockResolvedValueOnce({ rows: [] })

      await getProjectTasks(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    test('should reject invalid project ID', async () => {
      req.params = { projectId: 'abc' }

      await getProjectTasks(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(pool.query).not.toHaveBeenCalled()
    })
  })

  // =====================================
  // CREATE TASK
  // =====================================

  describe('createTask', () => {
    test('should create a task without an assignee', async () => {
      const task = {
        id: 1,
        project_id: 10,
        title: 'Build authentication',
        description: 'Implement JWT authentication',
        status: 'To Do',
        priority: 'High',
        assigned_to: null,
      }

      req.params = { projectId: '10' }

      req.body = {
        title: 'Build authentication',
        description: 'Implement JWT authentication',
        priority: 'High',
      }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [task] })
        .mockResolvedValueOnce({ rows: [] })

      await createTask(req, res, next)

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN')

      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO tasks'),
        [
          10,
          1,
          'Build authentication',
          'Implement JWT authentication',
          'To Do',
          'High',
          null,
          null,
          null,
        ]
      )

      expect(createNotification).not.toHaveBeenCalled()

      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT')

      expect(res.status).toHaveBeenCalledWith(201)
      expect(mockClient.release).toHaveBeenCalled()
    })

    test('should create a task and notify its assignee', async () => {
      const task = {
        id: 2,
        project_id: 10,
        title: 'Build login page',
        assigned_to: 2,
      }

      req.params = { projectId: '10' }
      req.body = {
        title: 'Build login page',
        assigned_to: 2,
      }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 10, assignee_allowed: true }],
        })
        .mockResolvedValueOnce({ rows: [task] })
        .mockResolvedValueOnce({ rows: [] })

      await createTask(req, res, next)

      expect(createNotification).toHaveBeenCalledWith(
        {
          userId: 2,
          actorId: 1,
          type: 'task_assigned',
          message: 'You have been assigned a new task: Build login page.',
          taskId: 2,
          projectId: 10,
        },
        mockClient
      )

      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT')
      expect(res.status).toHaveBeenCalledWith(201)
    })

    test('should not notify when assigning a task to yourself', async () => {
      const task = {
        id: 3,
        project_id: 10,
        title: 'Review my code',
        assigned_to: 1,
      }

      req.params = { projectId: '10' }
      req.body = {
        title: 'Review my code',
        assigned_to: 1,
      }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 10, assignee_allowed: true }],
        })
        .mockResolvedValueOnce({ rows: [task] })
        .mockResolvedValueOnce({ rows: [] })

      await createTask(req, res, next)

      expect(createNotification).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(201)
    })

    test('should reject an assignee outside the project', async () => {
      req.params = { projectId: '10' }
      req.body = {
        title: 'Build login page',
        assigned_to: 99,
      }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 10, assignee_allowed: false }],
        })
        .mockResolvedValueOnce({ rows: [] })

      await createTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(createNotification).not.toHaveBeenCalled()
      expect(mockClient.query).toHaveBeenLastCalledWith('ROLLBACK')
    })

    test('should reject an invalid assigned user ID', async () => {
      req.params = { projectId: '10' }
      req.body = {
        title: 'Build login page',
        assigned_to: -5,
      }

      await createTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(pool.connect).not.toHaveBeenCalled()
    })

    test('should reject a missing title', async () => {
      req.params = { projectId: '10' }
      req.body = { description: 'Task description' }

      await createTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(pool.connect).not.toHaveBeenCalled()
    })

    test('should reject invalid status', async () => {
      req.params = { projectId: '10' }
      req.body = {
        title: 'Build authentication',
        status: 'Invalid Status',
      }

      await createTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(pool.connect).not.toHaveBeenCalled()
    })

    test('should reject invalid priority', async () => {
      req.params = { projectId: '10' }
      req.body = {
        title: 'Build authentication',
        priority: 'Urgent',
      }

      await createTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(pool.connect).not.toHaveBeenCalled()
    })

    test('should return 404 when project does not exist', async () => {
      req.params = { projectId: '10' }
      req.body = { title: 'Build authentication' }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })

      await createTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockClient.query).toHaveBeenLastCalledWith('ROLLBACK')
    })

    test('should roll back if notification creation fails', async () => {
      const task = {
        id: 4,
        project_id: 10,
        title: 'Build dashboard',
        assigned_to: 2,
      }

      const notificationError = new Error(
        'Notification database error'
      )

      req.params = { projectId: '10' }
      req.body = {
        title: 'Build dashboard',
        assigned_to: 2,
      }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 10, assignee_allowed: true }],
        })
        .mockResolvedValueOnce({ rows: [task] })
        .mockResolvedValueOnce({ rows: [] })

      createNotification.mockRejectedValueOnce(notificationError)

      await createTask(req, res, next)

      expect(mockClient.query).toHaveBeenLastCalledWith('ROLLBACK')
      expect(next).toHaveBeenCalledWith(notificationError)
      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  // =====================================
  // UPDATE TASK
  // =====================================

  describe('updateTask', () => {
    test('should update a task successfully', async () => {
      const task = {
        id: 1,
        project_id: 10,
        title: 'Updated task',
        status: 'Completed',
        priority: 'High',
        assigned_to: null,
      }

      req.params = { id: '1' }
      req.body = {
        title: 'Updated task',
        status: 'Completed',
      }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [task] })
        .mockResolvedValueOnce({ rows: [] })

      await updateTask(req, res, next)

      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE tasks AS t'),
        ['Updated task', 'Completed', 1, 1]
      )

      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT')
      expect(createNotification).not.toHaveBeenCalled()

      expect(res.json).toHaveBeenCalledWith({
        message: 'Task updated successfully.',
        task,
      })
    })

    test('should assign an unassigned task and notify the new assignee', async () => {
      const task = {
        id: 1,
        project_id: 10,
        title: 'Build login page',
        assigned_to: 2,
      }

      req.params = { id: '1' }
      req.body = { assigned_to: 2 }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            project_id: 10,
            assigned_to: null,
            title: 'Build login page',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 10,
            assignee_allowed: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [task] })
        .mockResolvedValueOnce({ rows: [] })

      await updateTask(req, res, next)

      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FOR UPDATE OF t'),
        [1, 1]
      )

      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('assignee_allowed'),
        [10, 1, 2]
      )

      expect(createNotification).toHaveBeenCalledWith(
        {
          userId: 2,
          actorId: 1,
          type: 'task_assigned',
          message: 'You have been assigned a task: Build login page.',
          taskId: 1,
          projectId: 10,
        },
        mockClient
      )

      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT')
    })

    test('should notify the new assignee when a task is reassigned', async () => {
      const task = {
        id: 1,
        project_id: 10,
        title: 'Build login page',
        assigned_to: 3,
      }

      req.params = { id: '1' }
      req.body = { assigned_to: 3 }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            project_id: 10,
            assigned_to: 2,
            title: 'Build login page',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 10,
            assignee_allowed: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [task] })
        .mockResolvedValueOnce({ rows: [] })

      await updateTask(req, res, next)

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 3,
          actorId: 1,
          type: 'task_assigned',
          taskId: 1,
          projectId: 10,
        }),
        mockClient
      )

      expect(res.json).toHaveBeenCalled()
    })

    test('should not notify when the assignee remains unchanged', async () => {
      const task = {
        id: 1,
        project_id: 10,
        title: 'Build login page',
        assigned_to: 2,
      }

      req.params = { id: '1' }
      req.body = { assigned_to: 2 }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            project_id: 10,
            assigned_to: 2,
            title: 'Build login page',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 10,
            assignee_allowed: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [task] })
        .mockResolvedValueOnce({ rows: [] })

      await updateTask(req, res, next)

      expect(createNotification).not.toHaveBeenCalled()
      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT')
    })

    test('should not notify when assigning a task to yourself', async () => {
      const task = {
        id: 1,
        project_id: 10,
        title: 'My task',
        assigned_to: 1,
      }

      req.params = { id: '1' }
      req.body = { assigned_to: 1 }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            project_id: 10,
            assigned_to: 2,
            title: 'My task',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 10,
            assignee_allowed: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [task] })
        .mockResolvedValueOnce({ rows: [] })

      await updateTask(req, res, next)

      expect(createNotification).not.toHaveBeenCalled()
      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT')
    })

    test('should remove an assignee without creating a notification', async () => {
      const existingTask = {
        id: 1,
        project_id: 10,
        title: 'Build login page',
        assigned_to: 2,
      }

      const updatedTask = {
        id: 1,
        project_id: 10,
        title: 'Build login page',
        assigned_to: null,
      }

      req.params = { id: '1' }
      req.body = { assigned_to: null }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [existingTask],
        }) // SELECT and lock task
        .mockResolvedValueOnce({
          rows: [updatedTask],
        }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }) // COMMIT

      await updateTask(req, res, next)

      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE tasks AS t'),
        [null, 1, 1]
      )

      expect(createNotification).not.toHaveBeenCalled()

      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT')

      expect(res.json).toHaveBeenCalledWith({
        message: 'Task updated successfully.',
        task: updatedTask,
      })

      expect(mockClient.release).toHaveBeenCalled()
    })

    test('should reject an assignee outside the project', async () => {
      req.params = { id: '1' }
      req.body = { assigned_to: 99 }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            project_id: 10,
            assigned_to: null,
            title: 'Test task',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 10,
            assignee_allowed: false,
          }],
        })
        .mockResolvedValueOnce({ rows: [] })

      await updateTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Assigned user must belong to this project.',
      })

      expect(createNotification).not.toHaveBeenCalled()
      expect(mockClient.query).toHaveBeenLastCalledWith('ROLLBACK')
    })

    test('should return 404 when task cannot be found for assignment', async () => {
      req.params = { id: '1' }
      req.body = { assigned_to: 2 }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })

      await updateTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(createNotification).not.toHaveBeenCalled()
      expect(mockClient.query).toHaveBeenLastCalledWith('ROLLBACK')
    })

    test('should reject an invalid assigned user ID', async () => {
      req.params = { id: '1' }
      req.body = { assigned_to: -5 }

      await updateTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(pool.connect).not.toHaveBeenCalled()
    })

    test('should reject an invalid task ID', async () => {
      req.params = { id: 'abc' }
      req.body = { title: 'Updated task' }

      await updateTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(pool.connect).not.toHaveBeenCalled()
    })

    test('should reject an empty update request', async () => {
      req.params = { id: '1' }
      req.body = {}

      await updateTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(pool.connect).not.toHaveBeenCalled()
    })

    test('should return 404 when task cannot be updated', async () => {
      req.params = { id: '1' }
      req.body = { title: 'Updated task' }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })

      await updateTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockClient.query).toHaveBeenLastCalledWith('ROLLBACK')
    })

    test('should roll back the update if notification creation fails', async () => {
      const task = {
        id: 1,
        project_id: 10,
        title: 'Build login page',
        assigned_to: 2,
      }

      const notificationError = new Error(
        'Notification database error'
      )

      req.params = { id: '1' }
      req.body = { assigned_to: 2 }

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            project_id: 10,
            assigned_to: null,
            title: 'Build login page',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 10,
            assignee_allowed: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [task] })
        .mockResolvedValueOnce({ rows: [] })

      createNotification.mockRejectedValueOnce(notificationError)

      await updateTask(req, res, next)

      expect(createNotification).toHaveBeenCalled()
      expect(mockClient.query).toHaveBeenLastCalledWith('ROLLBACK')
      expect(next).toHaveBeenCalledWith(notificationError)
      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  // =====================================
  // DELETE TASK
  // =====================================

  describe('deleteTask', () => {
    test('should delete a task successfully', async () => {
      req.params = { id: '1' }

      pool.query.mockResolvedValue({
        rows: [{ id: 1 }],
      })

      await deleteTask(req, res, next)

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM tasks t'),
        [1, 1]
      )

      expect(res.json).toHaveBeenCalledWith({
        message: 'Task deleted successfully.',
        taskId: 1,
      })
    })

    test('should return 404 when task does not belong to user', async () => {
      req.params = { id: '1' }

      pool.query.mockResolvedValue({ rows: [] })

      await deleteTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    test('should reject invalid task ID', async () => {
      req.params = { id: 'abc' }

      await deleteTask(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(pool.query).not.toHaveBeenCalled()
    })
  })
})
