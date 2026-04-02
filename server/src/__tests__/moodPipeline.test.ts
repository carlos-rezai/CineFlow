import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runMoodPipeline } from '../../../ai/pipelines/moodPipeline.js'
import type { MoodCandidate, MoodAttributes } from '../lib/scoreCandidates.js'

vi.mock('../../../ai/prompts/extractMoodAttributes.js')
import { extractMoodAttributes } from '../../../ai/prompts/extractMoodAttributes.js'

const mockedExtract = vi.mocked(extractMoodAttributes)

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
    tmdbRating: null,
    ...overrides,
  }
}

const defaultAttributes: MoodAttributes = {
  genres: { Action: 0.9 },
  runtimePreference: 'any',
  preferUnwatched: false,
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('runMoodPipeline()', () => {
  it('calls extractMoodAttributes with the MoodInput', async () => {
    mockedExtract.mockResolvedValue(defaultAttributes)
    const input = { tags: ['Intense' as const], freeText: 'something gritty' }
    const getCandidatesFn = vi
      .fn()
      .mockResolvedValue([makeCandidate({ tmdbId: 1 })])

    await runMoodPipeline(input, getCandidatesFn)

    expect(mockedExtract).toHaveBeenCalledWith(input)
  })

  it('calls getCandidatesFn after attribute extraction', async () => {
    mockedExtract.mockResolvedValue(defaultAttributes)
    const getCandidatesFn = vi
      .fn()
      .mockResolvedValue([makeCandidate({ tmdbId: 1 })])

    await runMoodPipeline({ tags: [], freeText: '' }, getCandidatesFn)

    expect(getCandidatesFn).toHaveBeenCalledOnce()
  })

  it('returns the highest-scored candidate as topPick', async () => {
    mockedExtract.mockResolvedValue({
      genres: { Action: 0.9, Drama: 0.1 },
      runtimePreference: 'any',
      preferUnwatched: false,
    })
    const candidates = [
      makeCandidate({ tmdbId: 1, genres: ['Drama'] }), // score 0.1
      makeCandidate({ tmdbId: 2, genres: ['Action'] }), // score 0.9
    ]
    const getCandidatesFn = vi.fn().mockResolvedValue(candidates)

    const result = await runMoodPipeline(
      { tags: [], freeText: '' },
      getCandidatesFn,
    )

    expect(result.topPick?.tmdbId).toBe(2)
  })

  it('returns up to 3 runners after the topPick', async () => {
    mockedExtract.mockResolvedValue(defaultAttributes)
    const candidates = [1, 2, 3, 4].map((id) => makeCandidate({ tmdbId: id }))
    const getCandidatesFn = vi.fn().mockResolvedValue(candidates)

    const result = await runMoodPipeline(
      { tags: [], freeText: '' },
      getCandidatesFn,
    )

    expect(result.runners).toHaveLength(3)
  })

  it('runners never exceeds 3 even when many scored candidates exist', async () => {
    mockedExtract.mockResolvedValue(defaultAttributes)
    const candidates = [1, 2, 3, 4, 5, 6, 7, 8].map((id) =>
      makeCandidate({ tmdbId: id }),
    )
    const getCandidatesFn = vi.fn().mockResolvedValue(candidates)

    const result = await runMoodPipeline(
      { tags: [], freeText: '' },
      getCandidatesFn,
    )

    expect(result.runners.length).toBeLessThanOrEqual(3)
  })

  it('runners does not include the topPick', async () => {
    mockedExtract.mockResolvedValue(defaultAttributes)
    const candidates = [1, 2, 3, 4].map((id) => makeCandidate({ tmdbId: id }))
    const getCandidatesFn = vi.fn().mockResolvedValue(candidates)

    const result = await runMoodPipeline(
      { tags: [], freeText: '' },
      getCandidatesFn,
    )

    const runnerIds = result.runners.map((r) => r.tmdbId)
    expect(runnerIds).not.toContain(result.topPick?.tmdbId)
  })

  it('returns { topPick: null, runners: [] } when no candidates remain after scoring', async () => {
    mockedExtract.mockResolvedValue({
      genres: { Action: 0.9 },
      runtimePreference: 'any',
      preferUnwatched: true,
    })
    const candidates = [
      makeCandidate({ tmdbId: 1, watched: true }),
      makeCandidate({ tmdbId: 2, watched: true }),
    ]
    const getCandidatesFn = vi.fn().mockResolvedValue(candidates)

    const result = await runMoodPipeline(
      { tags: ['Something New' as const], freeText: '' },
      getCandidatesFn,
    )

    expect(result).toEqual({ topPick: null, runners: [] })
  })

  it('rejects when extractMoodAttributes throws', async () => {
    mockedExtract.mockRejectedValue(new Error('Gemini API error'))
    const getCandidatesFn = vi.fn()

    await expect(
      runMoodPipeline({ tags: [], freeText: '' }, getCandidatesFn),
    ).rejects.toThrow()
  })
})
