import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { connect, disconnect, getDb } from '../lib/db.js'
import {
  upsertTmdbMovie,
  refreshIfStale,
} from '../services/tmdbMovieService.js'

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

const tmdbMovieInput = {
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
}

describe('tmdbMovieService', () => {
  it('upserts a TMDBMovie — creates on first call, reuses the same document on second call with the same tmdbId', async () => {
    const input = { ...tmdbMovieInput, cachedAt: '2026-01-01T00:00:00.000Z' }

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

  describe('refreshIfStale', () => {
    it('does not fetch from TMDB when cachedAt is recent', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error('fetch should not be called'))
      vi.stubGlobal('fetch', mockFetch)

      await upsertTmdbMovie({
        ...tmdbMovieInput,
        cachedAt: new Date().toISOString(),
      })

      await refreshIfStale(335984)

      expect(mockFetch).not.toHaveBeenCalled()

      vi.unstubAllGlobals()
    })

    it('fetches from TMDB and updates the movie when cachedAt is 31 days ago', async () => {
      const staleDate = new Date()
      staleDate.setDate(staleDate.getDate() - 31)

      await upsertTmdbMovie({
        ...tmdbMovieInput,
        cachedAt: staleDate.toISOString(),
      })

      const freshDetails = {
        id: 335984,
        title: 'Blade Runner 2049',
        release_date: '2017-10-06',
        poster_path: '/fresh-poster.jpg',
        overview: 'Updated overview.',
        runtime: 164,
        genres: [{ name: 'Science Fiction' }],
        credits: {
          crew: [{ job: 'Director', name: 'Denis Villeneuve' }],
          cast: [{ name: 'Ryan Gosling' }],
        },
        vote_average: 8.1,
      }

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(freshDetails),
        }),
      )

      await refreshIfStale(335984)

      const db = getDb()
      const updated = await db
        .collection('tmdb_movies')
        .findOne({ tmdbId: 335984 })

      expect(updated?.posterUrl).toBe(
        'https://image.tmdb.org/t/p/w500/fresh-poster.jpg',
      )
      expect(updated?.tmdbRating).toBe(8.1)

      vi.unstubAllGlobals()
    })

    it('does not update the movie when TMDB returns a non-ok response', async () => {
      const staleDate = new Date()
      staleDate.setDate(staleDate.getDate() - 31)

      await upsertTmdbMovie({
        ...tmdbMovieInput,
        posterUrl: 'https://image.tmdb.org/t/p/w500/original.jpg',
        cachedAt: staleDate.toISOString(),
      })

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }),
      )

      await refreshIfStale(335984)

      const db = getDb()
      const unchanged = await db
        .collection('tmdb_movies')
        .findOne({ tmdbId: 335984 })

      expect(unchanged?.posterUrl).toBe(
        'https://image.tmdb.org/t/p/w500/original.jpg',
      )

      vi.unstubAllGlobals()
    })
  })
})
