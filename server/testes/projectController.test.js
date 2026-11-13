jest.mock('../config/database', () => ({
  query: jest.fn(),
}))

const pool = require('../config/database')

const {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController')

describe('Project Controller', () => {
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
  // GET PROJECTS
  // =====================================

  describe('getProjects', () => {
    test('should return projects belonging to the logged-in user', async () => {
      const projects = [
        {
          id: 1,
          name: 'WorkFlow Pro',
          description: 'Project management app',
          status: 'In Progress',
        },
      ]

      pool.query.mockResolvedValue({
        rows: projects,
      })

      await getProjects(req, res, next)

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [1]
      )

      expect(res.json).toHaveBeenCalledWith({
        projects,
      })
    })

    test('should pass database errors to the error handler', async () => {
      const error = new Error('Database error')

      pool.query.mockRejectedValue(error)

      await getProjects(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  // =====================================
  // CREATE PROJECT
  // =====================================

  describe('createProject', () => {
    test('should create a project successfully', async () => {
      const project = {
        id: 1,
        name: 'WorkFlow Pro',
        description: 'Project management app',
        status: 'Planning',
      }

      req.body = {
        name: 'WorkFlow Pro',
        description: 'Project management app',
      }

      pool.query.mockResolvedValue({
        rows: [project],
      })

      await createProject(req, res, next)

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projects'),
        [1, 'WorkFlow Pro', 'Project management app', 'Planning']
      )

      expect(res.status).toHaveBeenCalledWith(201)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Project created successfully.',
        project,
      })
    })

    test('should reject a project with a missing name', async () => {
      req.body = {
        description: 'Project description',
      }

      await createProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Project name is required.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject a project with a name longer than 150 characters', async () => {
      req.body = {
        name: 'A'.repeat(151),
      }

      await createProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Project name must be 150 characters or fewer.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject a description longer than 2000 characters', async () => {
      req.body = {
        name: 'WorkFlow Pro',
        description: 'A'.repeat(2001),
      }

      await createProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Description must be 2000 characters or fewer.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject an invalid project status', async () => {
      req.body = {
        name: 'WorkFlow Pro',
        status: 'Invalid Status',
      }

      await createProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid project status.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject a non-object request body', async () => {
      req.body = ['WorkFlow Pro']

      await createProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Request body must be a valid object.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })
  })

  // =====================================
  // UPDATE PROJECT
  // =====================================

  describe('updateProject', () => {
    test('should update a project successfully', async () => {
      const project = {
        id: 1,
        name: 'Updated Project',
        description: 'Updated description',
        status: 'In Progress',
      }

      req.params = { id: '1' }

      req.body = {
        name: 'Updated Project',
        description: 'Updated description',
        status: 'In Progress',
      }

      pool.query.mockResolvedValue({
        rows: [project],
      })

      await updateProject(req, res, next)

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'WHERE id = $4 AND user_id = $5'
        ),
        [
          'Updated Project',
          'Updated description',
          'In Progress',
          1,
          1,
        ]
      )

      expect(res.json).toHaveBeenCalledWith({
        message: 'Project updated successfully.',
        project,
      })
    })

    test('should reject an invalid project ID', async () => {
      req.params = { id: 'abc' }

      req.body = {
        name: 'Updated Project',
        status: 'In Progress',
      }

      await updateProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid project ID.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should return 404 when the project does not exist or does not belong to the user', async () => {
      req.params = { id: '1' }

      req.body = {
        name: 'Updated Project',
        status: 'In Progress',
      }

      pool.query.mockResolvedValue({
        rows: [],
      })

      await updateProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Project not found.',
      })
    })

    test('should reject an update when project name is missing', async () => {
      req.params = { id: '1' }

      req.body = {
        description: 'Updated description',
        status: 'In Progress',
      }

      await updateProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Project name is required.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject an update when project status is missing', async () => {
      req.params = { id: '1' }

      req.body = {
        name: 'Updated Project',
      }

      await updateProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Project status is required.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })

    test('should reject an update when project status is invalid', async () => {
      req.params = { id: '1' }

      req.body = {
        name: 'Updated Project',
        status: 'Invalid Status',
      }

      await updateProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid project status.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })
  })

  // =====================================
  // DELETE PROJECT
  // =====================================

  describe('deleteProject', () => {
    test('should delete a project successfully', async () => {
      req.params = { id: '1' }

      pool.query.mockResolvedValue({
        rows: [{ id: 1 }],
      })

      await deleteProject(req, res, next)

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'WHERE id = $1 AND user_id = $2'
        ),
        [1, 1]
      )

      expect(res.json).toHaveBeenCalledWith({
        message: 'Project deleted successfully.',
        projectId: 1,
      })
    })

    test('should return 404 when the project does not exist or does not belong to the user', async () => {
      req.params = { id: '1' }

      pool.query.mockResolvedValue({
        rows: [],
      })

      await deleteProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Project not found.',
      })
    })

    test('should reject deletion when project ID is invalid', async () => {
      req.params = { id: 'abc' }

      await deleteProject(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)

      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid project ID.',
      })

      expect(pool.query).not.toHaveBeenCalled()
    })
  })
})