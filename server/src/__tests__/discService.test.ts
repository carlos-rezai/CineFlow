import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { connect, disconnect, getDb } from '../lib/db.js'
import {
  createDisc,
  listDiscs,
  getDisc,
  updateDisc,
  deleteDisc,
  checkDuplicate,
} from '../services/discService.js'
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
  await db.collection('discs').deleteMany({})
  await db.collection('tmdb_movies').deleteMany({})
})

describe('discService', () => {
  it('creates a disc that can be retrieved', async () => {
    await createDisc({
      barcode: '012569803638',
      format: '4K',
      tmdbId: 335984,
    })

    const discs = await listDiscs()

    expect(discs).toHaveLength(1)
    expect(discs[0].barcode).toBe('012569803638')
    expect(discs[0].format).toBe('4K')
    expect(discs[0].tmdbId).toBe(335984)
  })

  it('listDiscs filters to only unwatched discs when watched:false is passed', async () => {
    await createDisc({ barcode: '111', format: '4K', tmdbId: 1 })
    await createDisc({ barcode: '222', format: 'Blu-ray', tmdbId: 2 })

    // mark one watched via a direct DB write — updateDisc not yet implemented
    const db = getDb()
    await db
      .collection('discs')
      .updateOne({ barcode: '111' }, { $set: { watched: true } })

    const unwatched = await listDiscs({ watched: false })

    expect(unwatched).toHaveLength(1)
    expect(unwatched[0].barcode).toBe('222')
  })

  it('getDisc returns the disc joined with its TMDBMovie', async () => {
    await upsertTmdbMovie({
      tmdbId: 335984,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
      overview: 'A blade runner discovers a secret.',
      runtime: 164,
      genres: ['Science Fiction', 'Drama'],
      directors: ['Denis Villeneuve'],
      cast: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas'],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    const disc = await createDisc({
      barcode: '012569803638',
      format: '4K',
      tmdbId: 335984,
    })

    const result = await getDisc(disc._id.toString())

    expect(result).not.toBeNull()
    expect(result!.disc.barcode).toBe('012569803638')
    expect(result!.tmdbMovie.title).toBe('Blade Runner 2049')
    expect(result!.tmdbMovie.tmdbId).toBe(335984)
  })

  it('updateDisc patches any subset of writable fields', async () => {
    const disc = await createDisc({
      barcode: '012569803638',
      format: '4K',
      tmdbId: 335984,
    })

    const updated = await updateDisc(disc._id.toString(), {
      watched: true,
      rating: 5,
      notes: 'steelbook edition',
    })

    expect(updated).not.toBeNull()
    expect(updated!.watched).toBe(true)
    expect(updated!.rating).toBe(5)
    expect(updated!.notes).toBe('steelbook edition')
    // unpatched fields unchanged
    expect(updated!.barcode).toBe('012569803638')
    expect(updated!.format).toBe('4K')
  })

  it('deleteDisc removes the disc and leaves the TMDBMovie intact', async () => {
    await upsertTmdbMovie({
      tmdbId: 335984,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
      overview: 'A blade runner discovers a secret.',
      runtime: 164,
      genres: ['Science Fiction'],
      directors: ['Denis Villeneuve'],
      cast: ['Ryan Gosling'],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    const disc = await createDisc({
      barcode: '012569803638',
      format: '4K',
      tmdbId: 335984,
    })

    const deleted = await deleteDisc(disc._id.toString())
    const remaining = await listDiscs()
    const db = getDb()
    const tmdbMovie = await db
      .collection('tmdb_movies')
      .findOne({ tmdbId: 335984 })

    expect(deleted).toBe(true)
    expect(remaining).toHaveLength(0)
    expect(tmdbMovie).not.toBeNull()
  })

  it('listDiscs includes year, runtime, and tmdbRating from the joined TMDBMovie', async () => {
    await upsertTmdbMovie({
      tmdbId: 335984,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
      overview: 'A blade runner discovers a secret.',
      runtime: 164,
      genres: ['Science Fiction'],
      directors: ['Denis Villeneuve'],
      cast: ['Ryan Gosling'],
      tmdbRating: 7.9,
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    await createDisc({ barcode: '012569803638', format: '4K', tmdbId: 335984 })

    const discs = await listDiscs()

    expect(discs).toHaveLength(1)
    expect(discs[0].year).toBe(2017)
    expect(discs[0].runtime).toBe(164)
    expect(discs[0].tmdbRating).toBe(7.9)
  })

  it('checkDuplicate returns true when a disc with that barcode exists, false otherwise', async () => {
    await createDisc({ barcode: '012569803638', format: '4K', tmdbId: 335984 })

    expect(await checkDuplicate('012569803638')).toBe(true)
    expect(await checkDuplicate('000000000000')).toBe(false)
  })
})
