import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { connect, disconnect, getDb } from '../lib/db.js'
import { getStats } from '../services/statsService.js'
import { upsertTmdbMovie } from '../services/tmdbMovieService.js'
import { createDisc } from '../services/discService.js'

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
  await db.collection('discs').deleteMany({})
  await db.collection('tmdb_movies').deleteMany({})
})

describe('statsService', () => {
  it('totalWatchCount is the sum of watchCount values, not the count of watched=true discs', async () => {
    await upsertTmdbMovie({
      tmdbId: 1,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: '',
      overview: '',
      runtime: 164,
      genres: [],
      directors: [],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 2,
      title: 'Dune',
      year: 2021,
      posterUrl: '',
      overview: '',
      runtime: 155,
      genres: [],
      directors: [],
      cast: [],
      tmdbRating: 8.0,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })

    const disc1 = await createDisc({ barcode: '111', format: '4K', tmdbId: 1 })
    const disc2 = await createDisc({ barcode: '222', format: '4K', tmdbId: 2 })

    const db = getDb()
    // disc1 watched 3 times, disc2 watched 1 time — both watched=true
    await db
      .collection('discs')
      .updateOne({ _id: disc1._id }, { $set: { watched: true, watchCount: 3 } })
    await db
      .collection('discs')
      .updateOne({ _id: disc2._id }, { $set: { watched: true, watchCount: 1 } })

    const stats = await getStats()

    expect(stats.watchedCount).toBe(2) // 2 discs where watched=true
    expect(stats.totalWatchCount).toBe(4) // 3 + 1 = 4 total viewing events
  })

  it('averageRating is null when no discs have a rating', async () => {
    await upsertTmdbMovie({
      tmdbId: 1,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: '',
      overview: '',
      runtime: 164,
      genres: [],
      directors: [],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await createDisc({ barcode: '111', format: '4K', tmdbId: 1 })

    const stats = await getStats()

    expect(stats.averageRating).toBeNull()
  })

  it('averageRating is computed only over rated discs, rounded to 1 decimal', async () => {
    await upsertTmdbMovie({
      tmdbId: 1,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: '',
      overview: '',
      runtime: 164,
      genres: [],
      directors: [],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 2,
      title: 'Dune',
      year: 2021,
      posterUrl: '',
      overview: '',
      runtime: 155,
      genres: [],
      directors: [],
      cast: [],
      tmdbRating: 8.0,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 3,
      title: 'Arrival',
      year: 2016,
      posterUrl: '',
      overview: '',
      runtime: 116,
      genres: [],
      directors: [],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })

    const disc1 = await createDisc({ barcode: '111', format: '4K', tmdbId: 1 })
    const disc2 = await createDisc({ barcode: '222', format: '4K', tmdbId: 2 })
    await createDisc({ barcode: '333', format: '4K', tmdbId: 3 }) // unrated

    const db = getDb()
    await db
      .collection('discs')
      .updateOne({ _id: disc1._id }, { $set: { rating: 5 } })
    await db
      .collection('discs')
      .updateOne({ _id: disc2._id }, { $set: { rating: 4 } })

    const stats = await getStats()

    // (5 + 4) / 2 = 4.5; unrated disc is excluded
    expect(stats.averageRating).toBe(4.5)
  })

  it('directors are sorted by discCount descending with correct shape', async () => {
    await upsertTmdbMovie({
      tmdbId: 1,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: '',
      overview: '',
      runtime: 164,
      genres: [],
      directors: ['Denis Villeneuve'],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 2,
      title: 'Dune',
      year: 2021,
      posterUrl: '',
      overview: '',
      runtime: 155,
      genres: [],
      directors: ['Denis Villeneuve'],
      cast: [],
      tmdbRating: 8.0,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 3,
      title: 'The Dark Knight',
      year: 2008,
      posterUrl: '',
      overview: '',
      runtime: 152,
      genres: [],
      directors: ['Christopher Nolan'],
      cast: [],
      tmdbRating: 9.0,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })

    const disc1 = await createDisc({ barcode: '111', format: '4K', tmdbId: 1 })
    await createDisc({ barcode: '222', format: '4K', tmdbId: 2 })
    await createDisc({ barcode: '333', format: '4K', tmdbId: 3 })

    // mark one Villeneuve disc watched
    const db = getDb()
    await db
      .collection('discs')
      .updateOne({ _id: disc1._id }, { $set: { watched: true } })

    const stats = await getStats()

    expect(stats.directors[0].name).toBe('Denis Villeneuve')
    expect(stats.directors[0].discCount).toBe(2)
    expect(stats.directors[0].watchedCount).toBe(1)
    expect(stats.directors[0].titles).toContain('Blade Runner 2049')
    expect(stats.directors[0].titles).toContain('Dune')

    expect(stats.directors[1].name).toBe('Christopher Nolan')
    expect(stats.directors[1].discCount).toBe(1)
    expect(stats.directors[1].watchedCount).toBe(0)
  })

  it('genres are sorted by count descending', async () => {
    await upsertTmdbMovie({
      tmdbId: 1,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: '',
      overview: '',
      runtime: 164,
      genres: ['Science Fiction', 'Drama'],
      directors: [],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 2,
      title: 'Dune',
      year: 2021,
      posterUrl: '',
      overview: '',
      runtime: 155,
      genres: ['Science Fiction', 'Adventure'],
      directors: [],
      cast: [],
      tmdbRating: 8.0,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 3,
      title: 'Arrival',
      year: 2016,
      posterUrl: '',
      overview: '',
      runtime: 116,
      genres: ['Science Fiction'],
      directors: [],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })

    await createDisc({ barcode: '111', format: '4K', tmdbId: 1 })
    await createDisc({ barcode: '222', format: '4K', tmdbId: 2 })
    await createDisc({ barcode: '333', format: '4K', tmdbId: 3 })

    const stats = await getStats()

    // Science Fiction appears in all 3, Drama and Adventure appear once each
    expect(stats.genres[0].genre).toBe('Science Fiction')
    expect(stats.genres[0].count).toBe(3)
    // Drama and Adventure both count 1 — just verify they appear after
    expect(stats.genres.slice(1).map((g) => g.genre)).toContain('Drama')
    expect(stats.genres.slice(1).map((g) => g.genre)).toContain('Adventure')
  })

  it('returns basic counts for a mixed collection', async () => {
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
    await upsertTmdbMovie({
      tmdbId: 2,
      title: 'Dune',
      year: 2021,
      posterUrl: '',
      overview: '',
      runtime: 155,
      genres: ['Science Fiction', 'Adventure'],
      directors: ['Denis Villeneuve'],
      cast: [],
      tmdbRating: 8.0,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await upsertTmdbMovie({
      tmdbId: 3,
      title: 'Arrival',
      year: 2016,
      posterUrl: '',
      overview: '',
      runtime: 116,
      genres: ['Science Fiction', 'Drama'],
      directors: ['Denis Villeneuve'],
      cast: [],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })

    const disc1 = await createDisc({ barcode: '111', format: '4K', tmdbId: 1 })
    await createDisc({ barcode: '222', format: 'Blu-ray', tmdbId: 2 })
    await createDisc({ barcode: '333', format: 'DVD', tmdbId: 3 })

    // mark one watched
    const db = getDb()
    await db
      .collection('discs')
      .updateOne({ _id: disc1._id }, { $set: { watched: true, watchCount: 1 } })

    const stats = await getStats()

    expect(stats.totalDiscs).toBe(3)
    expect(stats.watchedCount).toBe(1)
    expect(stats.unwatchedCount).toBe(2)
    expect(stats.watchedPercent).toBe(33.3)
  })
})
