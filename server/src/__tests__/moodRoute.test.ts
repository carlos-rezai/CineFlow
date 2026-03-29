import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import express from 'express'
import { connect, disconnect, getDb } from '../lib/db.js'
import moodRouter from '../routes/mood.js'
import { upsertTmdbMovie } from '../services/tmdbMovieService.js'
import { createDisc } from '../services/discService.js'

vi.mock('../../../ai/prompts/extractMoodAttributes.js')
import { extractMoodAttributes } from '../../../ai/prompts/extractMoodAttributes.js'

const mockedExtract = vi.mocked(extractMoodAttributes)

let mongod: MongoMemoryServer
const app = express()
app.use(express.json())
app.use('/api/mood', moodRouter)

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await connect(mongod.getUri())
})

afterAll(async () => {
  await disconnect()
  await mongod.stop()
})

afterEach(async () => {
  const db = getDb()
  await db.collection('discs').deleteMany({})
  await db.collection('tmdb_movies').deleteMany({})
  vi.resetAllMocks()
})

describe('POST /api/mood', () => {
  it('returns topPick and runners when candidates exist', async () => {
    await upsertTmdbMovie({
      tmdbId: 1,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: 'https://example.com/br.jpg',
      overview: '',
      runtime: 164,
      genres: ['Science Fiction'],
      directors: ['Denis Villeneuve'],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await createDisc({ barcode: '001', format: '4K', tmdbId: 1 })

    mockedExtract.mockResolvedValue({
      genres: { 'Science Fiction': 0.9 },
      runtimePreference: 'any',
      preferUnwatched: false,
    })

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: ['Intense'], freeText: '' })

    expect(res.status).toBe(200)
    expect(res.body.topPick).toMatchObject({ tmdbId: 1, title: 'Blade Runner 2049' })
    expect(Array.isArray(res.body.runners)).toBe(true)
  })

  it('returns HTTP 200 with { topPick: null, runners: [] } when preferUnwatched eliminates all candidates', async () => {
    await upsertTmdbMovie({
      tmdbId: 2,
      title: 'Dune',
      year: 2021,
      posterUrl: '',
      overview: '',
      runtime: 155,
      genres: ['Science Fiction'],
      directors: ['Denis Villeneuve'],
      cast: [],
      tmdbRating: 8.0,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    const disc = await createDisc({ barcode: '002', format: '4K', tmdbId: 2 })
    await getDb()
      .collection('discs')
      .updateOne({ _id: disc._id }, { $set: { watched: true } })

    mockedExtract.mockResolvedValue({
      genres: { 'Science Fiction': 0.9 },
      runtimePreference: 'any',
      preferUnwatched: true,
    })

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: ['Something New'], freeText: '' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ topPick: null, runners: [] })
  })

  it('returns HTTP 500 when Gemini attribute extraction fails', async () => {
    mockedExtract.mockRejectedValue(new Error('Gemini API error'))

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: ['Intense'], freeText: '' })

    expect(res.status).toBe(500)
  })

  it('preferUnwatched: true excludes watched discs — unwatched disc becomes topPick', async () => {
    await upsertTmdbMovie({
      tmdbId: 3,
      title: 'Watched Film',
      year: 2020,
      posterUrl: '',
      overview: '',
      runtime: 120,
      genres: ['Action'],
      directors: [],
      cast: [],
      tmdbRating: 7,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 4,
      title: 'Unwatched Film',
      year: 2021,
      posterUrl: '',
      overview: '',
      runtime: 120,
      genres: ['Action'],
      directors: [],
      cast: [],
      tmdbRating: 7,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    const watchedDisc = await createDisc({ barcode: '003', format: '4K', tmdbId: 3 })
    await getDb()
      .collection('discs')
      .updateOne({ _id: watchedDisc._id }, { $set: { watched: true } })
    await createDisc({ barcode: '004', format: '4K', tmdbId: 4 })

    mockedExtract.mockResolvedValue({
      genres: { Action: 0.9 },
      runtimePreference: 'any',
      preferUnwatched: true,
    })

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: ['Something New'], freeText: '' })

    expect(res.status).toBe(200)
    expect(res.body.topPick.tmdbId).toBe(4)
    expect(res.body.topPick.watched).toBe(false)
  })
})
