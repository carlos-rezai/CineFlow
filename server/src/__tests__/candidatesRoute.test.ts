import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import express from 'express'
import { connect, disconnect, getDb } from '../lib/db.js'
import discsRouter from '../routes/discs.js'
import { upsertTmdbMovie } from '../services/tmdbMovieService.js'
import { createDisc } from '../services/discService.js'

let mongod: MongoMemoryServer
const app = express()
app.use(express.json())
app.use('/api/discs', discsRouter)

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
})

describe('GET /api/discs/candidates', () => {
  it('excludes discs where runtime is 0', async () => {
    await upsertTmdbMovie({
      tmdbId: 1,
      title: 'No Runtime',
      year: 2020,
      posterUrl: '',
      overview: '',
      runtime: 0,
      genres: ['Action'],
      directors: [],
      cast: [],
      tmdbRating: 7,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await createDisc({ barcode: '001', format: '4K', tmdbId: 1 })

    const res = await request(app).get('/api/discs/candidates')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(0)
  })

  it('excludes discs where genres is empty', async () => {
    await upsertTmdbMovie({
      tmdbId: 2,
      title: 'No Genres',
      year: 2020,
      posterUrl: '',
      overview: '',
      runtime: 120,
      genres: [],
      directors: [],
      cast: [],
      tmdbRating: 7,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await createDisc({ barcode: '002', format: '4K', tmdbId: 2 })

    const res = await request(app).get('/api/discs/candidates')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(0)
  })

  it('includes discs where runtime > 0 and genres is non-empty', async () => {
    await upsertTmdbMovie({
      tmdbId: 3,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: 'https://example.com/poster.jpg',
      overview: '',
      runtime: 164,
      genres: ['Science Fiction', 'Drama'],
      directors: ['Denis Villeneuve'],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await createDisc({ barcode: '003', format: '4K', tmdbId: 3 })

    const res = await request(app).get('/api/discs/candidates')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('returns the full Phase 4-ready shape for each candidate', async () => {
    await upsertTmdbMovie({
      tmdbId: 4,
      title: 'Dune',
      year: 2021,
      posterUrl: 'https://example.com/dune.jpg',
      overview: '',
      runtime: 155,
      genres: ['Science Fiction'],
      directors: ['Denis Villeneuve'],
      cast: [],
      tmdbRating: 8.0,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await createDisc({ barcode: '004', format: '4K', tmdbId: 4 })

    const res = await request(app).get('/api/discs/candidates')

    expect(res.status).toBe(200)
    const candidate = res.body[0]
    expect(candidate).toMatchObject({
      tmdbId: 4,
      title: 'Dune',
      year: 2021,
      posterUrl: 'https://example.com/dune.jpg',
      genres: ['Science Fiction'],
      runtime: 155,
      directors: ['Denis Villeneuve'],
      watched: false,
      watchCount: 0,
      lastWatchedAt: null,
      rating: null,
    })
  })

  it('returns only valid candidates when the collection is mixed', async () => {
    await upsertTmdbMovie({
      tmdbId: 5,
      title: 'Valid Film',
      year: 2020,
      posterUrl: '',
      overview: '',
      runtime: 100,
      genres: ['Drama'],
      directors: [],
      cast: [],
      tmdbRating: 7,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 6,
      title: 'No Runtime Film',
      year: 2020,
      posterUrl: '',
      overview: '',
      runtime: 0,
      genres: ['Drama'],
      directors: [],
      cast: [],
      tmdbRating: 7,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 7,
      title: 'No Genres Film',
      year: 2020,
      posterUrl: '',
      overview: '',
      runtime: 120,
      genres: [],
      directors: [],
      cast: [],
      tmdbRating: 7,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await createDisc({ barcode: '005', format: '4K', tmdbId: 5 })
    await createDisc({ barcode: '006', format: '4K', tmdbId: 6 })
    await createDisc({ barcode: '007', format: '4K', tmdbId: 7 })

    const res = await request(app).get('/api/discs/candidates')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Valid Film')
  })
})
