import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import express from 'express'
import { connect, disconnect, getDb } from '../lib/db.js'
import statsRouter from '../routes/stats.js'
import { upsertTmdbMovie } from '../services/tmdbMovieService.js'
import { createDisc } from '../services/discService.js'

let mongod: MongoMemoryServer
const app = express()
app.use(express.json())
app.use('/api/stats', statsRouter)

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

describe('GET /api/stats', () => {
  it('returns HTTP 200 with a valid CollectionStats payload', async () => {
    await upsertTmdbMovie({
      tmdbId: 1,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: '',
      overview: '',
      runtime: 164,
      genres: ['Science Fiction'],
      directors: ['Denis Villeneuve'],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await createDisc({ barcode: '111', format: '4K', tmdbId: 1 })

    const res = await request(app).get('/api/stats')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      totalDiscs: 1,
      watchedCount: 0,
      unwatchedCount: 1,
      totalWatchCount: 0,
      averageRating: null,
      formatBreakdown: { '4K': 1, 'Blu-ray': 0, DVD: 0 },
    })
    expect(Array.isArray(res.body.genres)).toBe(true)
    expect(Array.isArray(res.body.directors)).toBe(true)
  })
})
