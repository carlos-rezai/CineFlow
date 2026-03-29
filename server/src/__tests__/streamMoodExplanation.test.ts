import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@google/generative-ai')

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { MoodCandidate } from '../lib/scoreCandidates.js'
import { streamMoodExplanation } from '../../../ai/prompts/streamMoodExplanation.js'

const MockGoogleGenerativeAI = vi.mocked(GoogleGenerativeAI)

function makeCandidate(
  overrides: Partial<MoodCandidate> & { tmdbId: number },
): MoodCandidate {
  return {
    title: `Film ${overrides.tmdbId}`,
    year: 2020,
    posterUrl: '',
    genres: ['Action'],
    runtime: 120,
    directors: [],
    watched: false,
    watchCount: 0,
    lastWatchedAt: null,
    rating: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.GEMINI_API_KEY = 'test-key'
})

describe('streamMoodExplanation()', () => {
  it('returns an async iterable that yields string tokens from the Gemini stream', async () => {
    const mockStream = (async function* () {
      yield { text: () => 'A great ' }
      yield { text: () => 'film.' }
    })()
    const mockGenerateContentStream = vi
      .fn()
      .mockResolvedValue({ stream: mockStream })
    MockGoogleGenerativeAI.mockImplementation(
      () =>
        ({
          getGenerativeModel: vi.fn().mockReturnValue({
            generateContentStream: mockGenerateContentStream,
          }),
        }) as unknown as GoogleGenerativeAI,
    )

    const topPick = makeCandidate({ tmdbId: 1, title: 'Mad Max: Fury Road' })
    const iterable = await streamMoodExplanation(
      { tags: ['Intense'], freeText: 'action' },
      topPick,
    )

    const tokens: string[] = []
    for await (const token of iterable) {
      tokens.push(token)
    }

    expect(tokens).toEqual(['A great ', 'film.'])
  })

  it('rejects when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY

    await expect(
      streamMoodExplanation(
        { tags: [], freeText: '' },
        makeCandidate({ tmdbId: 1 }),
      ),
    ).rejects.toThrow()
  })

  it('rejects when generateContentStream throws', async () => {
    const mockGenerateContentStream = vi
      .fn()
      .mockRejectedValue(new Error('Gemini API down'))
    MockGoogleGenerativeAI.mockImplementation(
      () =>
        ({
          getGenerativeModel: vi.fn().mockReturnValue({
            generateContentStream: mockGenerateContentStream,
          }),
        }) as unknown as GoogleGenerativeAI,
    )

    await expect(
      streamMoodExplanation(
        { tags: ['Intense'], freeText: '' },
        makeCandidate({ tmdbId: 1 }),
      ),
    ).rejects.toThrow('Gemini API down')
  })
})
