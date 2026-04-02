import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@google/generative-ai')

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { MoodCandidate } from '../lib/scoreCandidates.js'
import { streamDecisionExplanation } from '../../../ai/prompts/streamDecisionExplanation.js'

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
    directors: ['Director A'],
    watched: false,
    watchCount: 0,
    lastWatchedAt: null,
    rating: null,
    tmdbRating: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.GEMINI_API_KEY = 'test-key'
})

describe('streamDecisionExplanation()', () => {
  it('returns an async iterable that yields string tokens from the Gemini stream', async () => {
    const mockStream = (async function* () {
      yield { text: () => 'You last watched ' }
      yield { text: () => 'an action film.' }
    })()
    const mockGenerateContentStream = vi
      .fn()
      .mockResolvedValue({ stream: mockStream })
    MockGoogleGenerativeAI.mockImplementation(function () {
      return {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContentStream: mockGenerateContentStream,
        }),
      }
    } as unknown as typeof GoogleGenerativeAI)

    const topPick = makeCandidate({ tmdbId: 1, title: 'Dune' })
    const last3Watched = [makeCandidate({ tmdbId: 2, title: 'Arrival' })]
    const reasons = [
      'not yet watched',
      'director completion — 2 of 3 Villeneuve films watched',
    ]

    const iterable = await streamDecisionExplanation(
      topPick,
      last3Watched,
      reasons,
    )

    const tokens: string[] = []
    for await (const token of iterable) {
      tokens.push(token)
    }

    expect(tokens).toEqual(['You last watched ', 'an action film.'])
  })

  it('passes reasons as human-readable strings to the prompt — not raw score floats', async () => {
    const mockStream = (async function* () {
      yield { text: () => 'token' }
    })()
    const mockGenerateContentStream = vi
      .fn()
      .mockResolvedValue({ stream: mockStream })
    MockGoogleGenerativeAI.mockImplementation(function () {
      return {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContentStream: mockGenerateContentStream,
        }),
      }
    } as unknown as typeof GoogleGenerativeAI)

    const topPick = makeCandidate({ tmdbId: 1 })
    const reasons = ['not yet watched', 'highly rated (5 stars)']

    await streamDecisionExplanation(topPick, [], reasons)

    const promptArg = mockGenerateContentStream.mock.calls[0][0] as string
    expect(promptArg).toContain('not yet watched')
    expect(promptArg).toContain('highly rated (5 stars)')
    // must NOT contain raw floats
    expect(promptArg).not.toMatch(/\d+\.\d{2,}/)
  })

  it('rejects when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY

    await expect(
      streamDecisionExplanation(makeCandidate({ tmdbId: 1 }), [], ['reason']),
    ).rejects.toThrow()
  })

  it('rejects when generateContentStream throws', async () => {
    const mockGenerateContentStream = vi
      .fn()
      .mockRejectedValue(new Error('Gemini API down'))
    MockGoogleGenerativeAI.mockImplementation(function () {
      return {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContentStream: mockGenerateContentStream,
        }),
      }
    } as unknown as typeof GoogleGenerativeAI)

    await expect(
      streamDecisionExplanation(makeCandidate({ tmdbId: 1 }), [], ['reason']),
    ).rejects.toThrow('Gemini API down')
  })
})
