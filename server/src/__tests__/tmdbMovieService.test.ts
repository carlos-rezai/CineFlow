import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { connect, disconnect, getDb } from '../lib/db.js'
import { upsertTmdbMovie } from '../services/tmdbMovieService.js'

let mongod: MongoMemoryServer

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
  await db.collection('tmdb_movies').deleteMany({})
})

describe('tmdbMovieService', () => {
  it('upserts a TMDBMovie — creates on first call, reuses the same document on second call with the same tmdbId', async () => {
    const input = {
      tmdbId: 335984,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
      overview: 'A blade runner discovers a secret.',
      runtime: 164,
      genres: ['Science Fiction'],
      directors: ['Denis Villeneuve'],
      cast: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas'],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    }

    const first = await upsertTmdbMovie(input)
    const second = await upsertTmdbMovie({
      ...input,
      posterUrl: 'https://image.tmdb.org/updated.jpg',
    })

    const db = getDb()
    const count = await db
      .collection('tmdb_movies')
      .countDocuments({ tmdbId: 335984 })

    expect(count).toBe(1)
    expect(first._id.toString()).toBe(second._id.toString())
    expect(second.posterUrl).toBe('https://image.tmdb.org/updated.jpg')
  })
})
