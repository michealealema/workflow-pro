const request = require('supertest')
const app = require('../app')
const jwt = require('jsonwebtoken')
const pool = require('../config/database')

describe('Project ownership security', () => {
  let userAToken

  beforeAll(() => {
    userAToken = jwt.sign(
      { id: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('returns only projects belonging to the logged-in user', async () => {
    const querySpy = jest.spyOn(pool, 'query').mockResolvedValue({
      rows: [
        {
          id: 10,
          name: 'User A project',
          description: 'Private project',
          status: 'Planning',
        },
      ],
    })

    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${userAToken}`)

    expect(response.status).toBe(200)
    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      [1]
    )
    expect(response.body.projects).toHaveLength(1)
  })

  test('prevents User A from updating User B project', async () => {
    jest.spyOn(pool, 'query').mockResolvedValue({
      rows: [],
    })

    const response = await request(app)
      .put('/api/projects/20')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Changed project',
        description: 'Trying to change another users project',
        status: 'Planning',
      })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      message: 'Project not found.',
    })
  })

  test('prevents User A from deleting User B project', async () => {
    jest.spyOn(pool, 'query').mockResolvedValue({
      rows: [],
    })

    const response = await request(app)
      .delete('/api/projects/20')
      .set('Authorization', `Bearer ${userAToken}`)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      message: 'Project not found.',
    })
  })
})
