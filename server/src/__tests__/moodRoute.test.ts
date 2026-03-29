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
import request from 'supertest'
import express from 'express'
import { connect, disconnect, getDb } from '../lib/db.js'
import moodRouter from '../routes/mood.js'
import { upsertTmdbMovie } from '../services/tmdbMovieService.js'
import { createDisc } from '../services/discService.js'

vi.mock('../../../ai/prompts/extractMoodAttributes.js')
vi.mock('../../../ai/prompts/streamMoodExplanation.js')

import { extractMoodAttributes } from '../../../ai/prompts/extractMoodAttributes.js'
import { streamMoodExplanation } from '../../../ai/prompts/streamMoodExplanation.js'

const mockedExtract = vi.mocked(extractMoodAttributes)
const mockedStreamExplanation = vi.mocked(streamMoodExplanation)

function parseNDJSON(text: string): unknown[] {
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

async function* tokenStream(...tokens: string[]): AsyncGenerator<string> {
  for (const token of tokens) yield token
}

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

async function seedDisc(tmdbId: number, opts?: { watched?: boolean }) {
  await upsertTmdbMovie({
    tmdbId,
    title: `Film ${tmdbId}`,
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
  const disc = await createDisc({
    barcode: `00${tmdbId}`,
    format: '4K',
    tmdbId,
  })
  if (opts?.watched) {
    await getDb()
      .collection('discs')
      .updateOne({ _id: disc._id }, { $set: { watched: true } })
  }
  return disc
}

const matchingAttributes = {
  genres: { Action: 0.9 },
  runtimePreference: 'any' as const,
  preferUnwatched: false,
}

describe('POST /api/mood (NDJSON streaming)', () => {
  it('responds with Content-Type application/x-ndjson', async () => {
    await seedDisc(1)
    mockedExtract.mockResolvedValue(matchingAttributes)
    mockedStreamExplanation.mockResolvedValue(tokenStream())

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: [], freeText: '' })

    expect(res.headers['content-type']).toMatch(/application\/x-ndjson/)
  })

  it('first frame is type:result with topPick and runners', async () => {
    await seedDisc(1)
    mockedExtract.mockResolvedValue(matchingAttributes)
    mockedStreamExplanation.mockResolvedValue(tokenStream())

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: [], freeText: '' })
    const frames = parseNDJSON(res.text) as Array<{
      type: string
      topPick: { tmdbId: number }
      runners: unknown[]
    }>

    expect(frames[0].type).toBe('result')
    expect(frames[0].topPick.tmdbId).toBe(1)
    expect(Array.isArray(frames[0].runners)).toBe(true)
  })

  it('emits token frames for each token yielded by streamMoodExplanation', async () => {
    await seedDisc(1)
    mockedExtract.mockResolvedValue(matchingAttributes)
    mockedStreamExplanation.mockResolvedValue(tokenStream('A great ', 'film.'))

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: [], freeText: '' })
    const frames = parseNDJSON(res.text) as Array<{
      type: string
      text?: string
    }>
    const tokenFrames = frames.filter((f) => f.type === 'token')

    expect(tokenFrames).toHaveLength(2)
    expect(tokenFrames[0].text).toBe('A great ')
    expect(tokenFrames[1].text).toBe('film.')
  })

  it('final frame on success is type:done', async () => {
    await seedDisc(1)
    mockedExtract.mockResolvedValue(matchingAttributes)
    mockedStreamExplanation.mockResolvedValue(tokenStream('Some token.'))

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: [], freeText: '' })
    const frames = parseNDJSON(res.text) as Array<{ type: string }>

    expect(frames[frames.length - 1].type).toBe('done')
  })

  it('emits a single empty frame when no candidates exist', async () => {
    mockedExtract.mockResolvedValue(matchingAttributes)

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: [], freeText: '' })
    const frames = parseNDJSON(res.text) as Array<{ type: string }>

    expect(frames).toHaveLength(1)
    expect(frames[0].type).toBe('empty')
  })

  it('emits result frame then error frame when streamMoodExplanation rejects', async () => {
    await seedDisc(1)
    mockedExtract.mockResolvedValue(matchingAttributes)
    mockedStreamExplanation.mockRejectedValue(new Error('Gemini stream failed'))

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: [], freeText: '' })
    const frames = parseNDJSON(res.text) as Array<{
      type: string
      message?: string
    }>

    expect(frames[0].type).toBe('result')
    expect(frames[frames.length - 1].type).toBe('error')
    expect(frames[frames.length - 1].message).toBeTruthy()
  })

  it('returns HTTP 500 when extractMoodAttributes fails (stream never opens)', async () => {
    mockedExtract.mockRejectedValue(new Error('Gemini API error'))

    const res = await request(app)
      .post('/api/mood')
      .send({ tags: [], freeText: '' })

    expect(res.status).toBe(500)
  })
})
