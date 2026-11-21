const request = require('supertest')
const app = require('../app')
const jwt = require('jsonwebtoken')
const pool = require('../config/database')

describe('Project team members', () => {
  let userAToken
  let userBToken

  beforeAll(() => {
    userAToken = jwt.sign(
      { id: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    userBToken = jwt.sign(
      { id: 2 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('returns project members for the project owner', async () => {
    jest.spyOn(pool, 'query')
      .mockResolvedValueOnce({
        rows: [{ id: 10 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: 2,
            name: 'Member One',
            email: 'member@example.com',
            role: 'member',
          },
        ],
      })

    const response = await request(app)
      .get('/api/projects/10/members')
      .set('Authorization', `Bearer ${userAToken}`)

    expect(response.status).toBe(200)
    expect(response.body.members).toHaveLength(1)
    expect(response.body.members[0].email)
      .toBe('member@example.com')
  })

  test('allows a project member to view the team members', async () => {
    jest.spyOn(pool, 'query')
      .mockResolvedValueOnce({
        rows: [{ id: 10 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: 2,
            name: 'Member One',
            email: 'member@example.com',
            role: 'member',
          },
        ],
      })

    const response = await request(app)
      .get('/api/projects/10/members')
      .set('Authorization', `Bearer ${userBToken}`)

    expect(response.status).toBe(200)
    expect(response.body.members).toHaveLength(1)
    expect(response.body.members[0].email)
      .toBe('member@example.com')
  })

  test('prevents users from viewing members of another users project', async () => {
    jest.spyOn(pool, 'query').mockResolvedValueOnce({
      rows: [],
    })

    const response = await request(app)
      .get('/api/projects/20/members')
      .set('Authorization', `Bearer ${userAToken}`)

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('Project not found.')
  })

  test('adds a verified user to a project', async () => {
    const querySpy = jest.spyOn(pool, 'query')

    querySpy
      .mockResolvedValueOnce({
        rows: [{ id: 10 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            name: 'Member One',
            email: 'member@example.com',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            project_id: 10,
            user_id: 2,
            role: 'member',
            added_at: new Date(),
          },
        ],
      })

    const response = await request(app)
      .post('/api/projects/10/members')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        email: 'MEMBER@example.com',
      })

    expect(response.status).toBe(201)
    expect(response.body.message)
      .toBe('Team member added successfully.')

    expect(querySpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('is_verified = TRUE'),
      ['member@example.com']
    )
  })

  test('rejects an invalid email address', async () => {
    const querySpy = jest.spyOn(pool, 'query')

    const response = await request(app)
      .post('/api/projects/10/members')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        email: 'not-an-email',
      })

    expect(response.status).toBe(400)
    expect(response.body.message)
      .toBe('Please provide a valid email address.')

    expect(querySpy).not.toHaveBeenCalled()
  })

  test('rejects an unregistered or unverified user', async () => {
    jest.spyOn(pool, 'query')
      .mockResolvedValueOnce({
        rows: [{ id: 10 }],
      })
      .mockResolvedValueOnce({
        rows: [],
      })

    const response = await request(app)
      .post('/api/projects/10/members')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        email: 'unknown@example.com',
      })

    expect(response.status).toBe(404)
    expect(response.body.message)
      .toBe('Verified user not found.')
  })

  test('prevents adding an existing member twice', async () => {
    jest.spyOn(pool, 'query')
      .mockResolvedValueOnce({
        rows: [{ id: 10 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            name: 'Member One',
            email: 'member@example.com',
          },
        ],
      })
      .mockRejectedValueOnce({
        code: '23505',
      })

    const response = await request(app)
      .post('/api/projects/10/members')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        email: 'member@example.com',
      })

    expect(response.status).toBe(409)
    expect(response.body.message)
      .toBe('This user is already a project member.')
  })

  test('removes a project member', async () => {
    jest.spyOn(pool, 'query')
      .mockResolvedValueOnce({
        rows: [{ id: 10 }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1 }],
      })

    const response = await request(app)
      .delete('/api/projects/10/members/2')
      .set('Authorization', `Bearer ${userAToken}`)

    expect(response.status).toBe(200)
    expect(response.body.message)
      .toBe('Team member removed successfully.')
  })

  test('returns 404 when the member does not exist', async () => {
    jest.spyOn(pool, 'query')
      .mockResolvedValueOnce({
        rows: [{ id: 10 }],
      })
      .mockResolvedValueOnce({
        rows: [],
      })

    const response = await request(app)
      .delete('/api/projects/10/members/99')
      .set('Authorization', `Bearer ${userAToken}`)

    expect(response.status).toBe(404)
    expect(response.body.message)
      .toBe('Project member not found.')
  })
})