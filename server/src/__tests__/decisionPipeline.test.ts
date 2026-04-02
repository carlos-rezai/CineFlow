import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../ai/prompts/streamDecisionExplanation.js')

import { streamDecisionExplanation } from '../../../ai/prompts/streamDecisionExplanation.js'
import { runDecisionPipeline } from '../../../ai/pipelines/decisionPipeline.js'
import type { MoodCandidate } from '../lib/scoreCandidates.js'

const mockedStreamExplanation = vi.mocked(streamDecisionExplanation)

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

async function* tokenStream(...tokens: string[]): AsyncGenerator<string> {
  for (const token of tokens) yield token
}

beforeEach(() => {
  vi.resetAllMocks()
  mockedStreamExplanation.mockResolvedValue(tokenStream())
})

describe('runDecisionPipeline()', () => {
  it('returns null when getCandidatesFn returns an empty array', async () => {
    const getCandidatesFn = vi.fn().mockResolvedValue([])

    const result = await runDecisionPipeline(getCandidatesFn)

    expect(result).toBeNull()
  })

  it('calls getCandidatesFn to fetch candidates', async () => {
    const getCandidatesFn = vi
      .fn()
      .mockResolvedValue([makeCandidate({ tmdbId: 1 })])

    await runDecisionPipeline(getCandidatesFn)

    expect(getCandidatesFn).toHaveBeenCalledOnce()
  })

  it('returns topPick, runners, reasons, and last3Watched when candidates exist', async () => {
    const getCandidatesFn = vi
      .fn()
      .mockResolvedValue([makeCandidate({ tmdbId: 1 })])

    const result = await runDecisionPipeline(getCandidatesFn)

    expect(result).not.toBeNull()
    expect(result).toHaveProperty('topPick')
    expect(result).toHaveProperty('runners')
    expect(result).toHaveProperty('reasons')
    expect(result).toHaveProperty('last3Watched')
  })

  it('passes reasons as strings to streamDecisionExplanation', async () => {
    const getCandidatesFn = vi
      .fn()
      .mockResolvedValue([makeCandidate({ tmdbId: 1 })])

    await runDecisionPipeline(getCandidatesFn)

    expect(mockedStreamExplanation).toHaveBeenCalledOnce()
    const [, , reasons] = mockedStreamExplanation.mock.calls[0] as [
      MoodCandidate,
      MoodCandidate[],
      string[],
    ]
    expect(Array.isArray(reasons)).toBe(true)
    expect(reasons.every((r) => typeof r === 'string')).toBe(true)
  })

  it('does not call streamDecisionExplanation when candidates is empty', async () => {
    const getCandidatesFn = vi.fn().mockResolvedValue([])

    await runDecisionPipeline(getCandidatesFn)

    expect(mockedStreamExplanation).not.toHaveBeenCalled()
  })

  it('returns the explanation stream from streamDecisionExplanation', async () => {
    mockedStreamExplanation.mockResolvedValue(tokenStream('A great ', 'pick.'))
    const getCandidatesFn = vi
      .fn()
      .mockResolvedValue([makeCandidate({ tmdbId: 1 })])

    const result = await runDecisionPipeline(getCandidatesFn)

    const tokens: string[] = []
    for await (const token of result!.explanationStream) {
      tokens.push(token)
    }
    expect(tokens).toEqual(['A great ', 'pick.'])
  })
})
