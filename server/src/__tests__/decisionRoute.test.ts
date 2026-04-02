import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import express from 'express'
import { connect, disconnect, getDb } from '../lib/db.js'
import decisionRouter from '../routes/decision.js'
import { upsertTmdbMovie } from '../services/tmdbMovieService.js'
import { createDisc } from '../services/discService.js'

// No Gemini mocks — this issue has no AI call

function parseNDJSON(text: string): unknown[] {
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

let mongod: MongoMemoryServer
const app = express()
app.use(express.json())
app.use('/api/decision', decisionRouter)

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

async function seedDisc(tmdbId: number) {
  await upsertTmdbMovie({
    tmdbId,
    title: `Film ${tmdbId}`,
    year: 2020,
    posterUrl: '',
    overview: '',
    runtime: 120,
    genres: ['Action'],
    directors: ['Director A'],
    cast: [],
    tmdbRating: 7.5,
    cachedAt: '2026-01-01T00:00:00.000Z',
  })
  return createDisc({ barcode: `00${tmdbId}`, format: '4K', tmdbId })
}

describe('POST /api/decision (NDJSON streaming)', () => {
  it('responds with Content-Type application/x-ndjson', async () => {
    await seedDisc(1)

    const res = await request(app).post('/api/decision').send()

    expect(res.headers['content-type']).toMatch(/application\/x-ndjson/)
  })

  it('first frame is type:result with topPick and runners', async () => {
    await seedDisc(1)

    const res = await request(app).post('/api/decision').send()
    const frames = parseNDJSON(res.text) as Array<{
      type: string
      topPick: { tmdbId: number }
      runners: unknown[]
    }>

    expect(frames[0].type).toBe('result')
    expect(frames[0].topPick.tmdbId).toBe(1)
    expect(Array.isArray(frames[0].runners)).toBe(true)
  })

  it('result frame includes reasons array with at least one string', async () => {
    await seedDisc(1)

    const res = await request(app).post('/api/decision').send()
    const frames = parseNDJSON(res.text) as Array<{
      type: string
      reasons?: string[]
    }>
    const resultFrame = frames.find((f) => f.type === 'result') as
      | { type: string; reasons: string[] }
      | undefined

    expect(resultFrame?.reasons).toBeDefined()
    expect(Array.isArray(resultFrame?.reasons)).toBe(true)
    expect((resultFrame?.reasons ?? []).length).toBeGreaterThan(0)
  })

  it('final frame on success is type:done', async () => {
    await seedDisc(1)

    const res = await request(app).post('/api/decision').send()
    const frames = parseNDJSON(res.text) as Array<{ type: string }>

    expect(frames[frames.length - 1].type).toBe('done')
  })

  it('emits a single empty frame when no candidates exist', async () => {
    const res = await request(app).post('/api/decision').send()
    const frames = parseNDJSON(res.text) as Array<{ type: string }>

    expect(frames).toHaveLength(1)
    expect(frames[0].type).toBe('empty')
  })
})
