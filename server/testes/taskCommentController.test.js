jest.mock('../config/database', () => ({
  query: jest.fn(),
}))

const pool = require('../config/database')

const {
  getTaskComments,
  createTaskComment,
} = require('../controllers/taskCommentController')

describe('Task Comment Controller', () => {
  let req
  let res
  let next

  beforeEach(() => {
    jest.clearAllMocks()

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
  // GET TASK COMMENTS
  // =====================================

  describe('getTaskComments', () => {
    test('should return comments belonging to an accessible task', async () => {
      const comments = [
        {
          id: 1,
          task_id: 10,
          user_id: 1,
          author_name: 'Micheale',
          content: 'First task comment',
        },
        {
          id: 2,
          task_id: 10,
          user_id: 2,
          author_name: 'Zemen',
          content: 'Second task comment',
        },
      ]

      req.params = { taskId: '10' }

      pool.query.mockResolvedValue({
        rows: comments,
      })

      await getTaskComments(req, res, next)

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM task_comments tc'),
        [10, 1]
      )

      expect(res.json).toHaveBeenCalledWith({
        comments,
      })
    })

    test('should return an empty comments array when no comments exist', async () => {
      req.params = { taskId: '10' }

      pool.query.mockResolvedValue({
        rows: [],
      })

      await getTaskComments(req, res, next)

      expect(res.json).toHaveBeenCalledWith({
        comments: [],
      })
    })

    test('should reject an invalid task ID', async () => {
      req.params = { taskId: 'abc' }

      await getTaskComments(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid task ID.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject a non-positive task ID', async () => {
      req.params = { taskId: '-5' }

      await getTaskComments(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should pass database errors to the error handler', async () => {
      const error = new Error('Database connection failed')

      req.params = { taskId: '10' }

      pool.query.mockRejectedValue(error)

      await getTaskComments(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  // =====================================
  // CREATE TASK COMMENT
  // =====================================

  describe('createTaskComment', () => {
    test('should create a comment successfully', async () => {
      const comment = {
        id: 1,
        task_id: 10,
        user_id: 1,
        content: 'This is my first comment.',
      }

      req.params = { taskId: '10' }

      req.body = {
        content: 'This is my first comment.',
      }

      pool.query.mockResolvedValue({
        rows: [comment],
      })

      await createTaskComment(req, res, next)

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO task_comments'),
        [10, 1, 'This is my first comment.']
      )

      expect(res.status).toHaveBeenCalledWith(201)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Comment created successfully.',
        comment,
      })
    })

    test('should trim unnecessary whitespace from comment content', async () => {
      req.params = { taskId: '10' }

      req.body = {
        content: '   Hello team!   ',
      }

      pool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            task_id: 10,
            user_id: 1,
            content: 'Hello team!',
          },
        ],
      })

      await createTaskComment(req, res, next)

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO task_comments'),
        [10, 1, 'Hello team!']
      )

      expect(res.status).toHaveBeenCalledWith(201)
    })

    test('should reject an invalid task ID', async () => {
      req.params = { taskId: 'abc' }

      req.body = {
        content: 'Hello team!',
      }

      await createTaskComment(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid task ID.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject a non-object request body', async () => {
      req.params = { taskId: '10' }
      req.body = null

      await createTaskComment(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Request body must be a valid object.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject an empty comment', async () => {
      req.params = { taskId: '10' }

      req.body = {
        content: '   ',
      }

      await createTaskComment(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Comment content is required.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject a comment with non-string content', async () => {
      req.params = { taskId: '10' }

      req.body = {
        content: 12345,
      }

      await createTaskComment(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject a comment longer than 5000 characters', async () => {
      req.params = { taskId: '10' }

      req.body = {
        content: 'a'.repeat(5001),
      }

      await createTaskComment(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Comment must be 5000 characters or fewer.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should return 404 when the task does not exist or is inaccessible', async () => {
      req.params = { taskId: '10' }

      req.body = {
        content: 'Hello team!',
      }

      pool.query.mockResolvedValue({
        rows: [],
      })

      await createTaskComment(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Task not found.',
      })
    })

    test('should pass database errors to the error handler', async () => {
      const error = new Error('Database connection failed')

      req.params = { taskId: '10' }

      req.body = {
        content: 'Hello team!',
      }

      pool.query.mockRejectedValue(error)

      await createTaskComment(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})