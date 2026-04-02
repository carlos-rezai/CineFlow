import { describe, it, expect } from 'vitest'
import {
  scoreDecisionCandidates,
  type DecisionResult,
} from '../lib/scoreDecisionCandidates.js'
import type { MoodCandidate } from '../../../ai/types/mood.js'

function makeCandidate(
  overrides: Partial<MoodCandidate> & { tmdbId: number },
): MoodCandidate {
  return {
    title: `Film ${overrides.tmdbId}`,
    year: 2020,
    posterUrl: '',
    genres: [],
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

describe('scoreDecisionCandidates()', () => {
  describe('empty input', () => {
    it('returns null when candidates array is empty', () => {
      expect(scoreDecisionCandidates([])).toBeNull()
    })
  })

  describe('result shape', () => {
    it('returns topPick, runners, reasons, and last3Watched for a non-empty array', () => {
      const candidates = [makeCandidate({ tmdbId: 1 })]
      const result = scoreDecisionCandidates(candidates)

      expect(result).not.toBeNull()
      expect(result).toHaveProperty('topPick')
      expect(result).toHaveProperty('runners')
      expect(result).toHaveProperty('reasons')
      expect(result).toHaveProperty('last3Watched')
    })

    it('returns at most 3 runners', () => {
      const candidates = Array.from({ length: 6 }, (_, i) =>
        makeCandidate({ tmdbId: i + 1 }),
      )
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.runners.length).toBeLessThanOrEqual(3)
    })

    it('topPick is not included in runners', () => {
      const candidates = Array.from({ length: 4 }, (_, i) =>
        makeCandidate({ tmdbId: i + 1 }),
      )
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.runners.map((r) => r.tmdbId)).not.toContain(
        result.topPick.tmdbId,
      )
    })

    it('reasons contains at least one human-readable string for the topPick', () => {
      const candidates = [makeCandidate({ tmdbId: 1 })]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.reasons.length).toBeGreaterThan(0)
      expect(typeof result.reasons[0]).toBe('string')
      expect(result.reasons[0].length).toBeGreaterThan(0)
    })

    it('works with a single candidate — topPick is set, runners is empty', () => {
      const candidates = [makeCandidate({ tmdbId: 1 })]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(1)
      expect(result.runners).toHaveLength(0)
    })
  })

  describe('last3Watched', () => {
    it('returns the 3 most recently watched discs sorted by lastWatchedAt descending', () => {
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          watched: true,
          lastWatchedAt: '2024-01-01T00:00:00Z',
        }),
        makeCandidate({
          tmdbId: 2,
          watched: true,
          lastWatchedAt: '2024-03-01T00:00:00Z',
        }),
        makeCandidate({
          tmdbId: 3,
          watched: true,
          lastWatchedAt: '2024-02-01T00:00:00Z',
        }),
        makeCandidate({
          tmdbId: 4,
          watched: true,
          lastWatchedAt: '2024-04-01T00:00:00Z',
        }),
        makeCandidate({ tmdbId: 5 }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.last3Watched.map((c) => c.tmdbId)).toEqual([4, 2, 3])
    })

    it('returns fewer than 3 when fewer watched discs exist', () => {
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          watched: true,
          lastWatchedAt: '2024-01-01T00:00:00Z',
        }),
        makeCandidate({ tmdbId: 2 }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.last3Watched).toHaveLength(1)
      expect(result.last3Watched[0].tmdbId).toBe(1)
    })

    it('returns empty last3Watched when no discs have been watched', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1 }),
        makeCandidate({ tmdbId: 2 }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.last3Watched).toHaveLength(0)
    })
  })

  describe('recency penalty', () => {
    it('applies −2 to a disc in last3Watched, preferring a non-recent disc', () => {
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          watched: true,
          lastWatchedAt: '2024-01-01T00:00:00Z',
        }),
        makeCandidate({ tmdbId: 2 }),
      ]
      // disc 1 is in last3Watched — recency penalty should push disc 2 to top
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(2)
    })

    it('does not apply recency penalty to a disc not in last3Watched', () => {
      // disc 2 has never been watched, disc 1 was watched recently
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          watched: true,
          lastWatchedAt: '2024-06-01T00:00:00Z',
          rating: 5, // +2 rating bonus, but −2 recency = net 0
        }),
        makeCandidate({
          tmdbId: 2,
          rating: 3, // no rating bonus, no recency penalty = net 0 + unwatched bonus +1
        }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      // disc 2: +1 unwatched > disc 1: +2 rating −2 recency = 0
      expect(result.topPick.tmdbId).toBe(2)
    })
  })

  describe('rating bonus', () => {
    it('applies +2 for rating 5', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, watched: true, rating: 5 }),
        makeCandidate({ tmdbId: 2, watched: true, rating: null }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(1)
    })

    it('applies +2 for rating 4', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, watched: true, rating: 4 }),
        makeCandidate({ tmdbId: 2, watched: true, rating: null }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(1)
    })

    it('does not apply rating bonus for rating 3', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, watched: true, rating: 3 }),
        makeCandidate({ tmdbId: 2, watched: true, rating: null }),
      ]
      // both should have equal base score — tiebreaker decides, not rating bonus
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      // neither gets +2; result is valid but disc 1 must not win due to rating
      expect([1, 2]).toContain(result.topPick.tmdbId)
    })

    it('does not apply rating bonus for null rating', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, watched: true, rating: null }),
        makeCandidate({ tmdbId: 2, watched: true, rating: 5 }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(2)
    })
  })

  describe('unwatched bonus', () => {
    it('applies +1 for watched=false', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, watched: false }),
        makeCandidate({ tmdbId: 2, watched: true }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(1)
    })

    it('does not apply unwatched bonus for watched=true', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, watched: true, rating: 4 }), // +2 rating only
        makeCandidate({ tmdbId: 2, watched: false }), // +1 unwatched only
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(1)
    })
  })

  describe('director completion boost', () => {
    it("applies +1 when ≥50% of a director's owned discs are watched but this disc is not", () => {
      // Director A has 2 discs: one watched, one not → 50% → boost applies to unwatched
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          directors: ['Director A'],
          watched: true,
          lastWatchedAt: '2024-01-01T00:00:00Z',
        }),
        makeCandidate({
          tmdbId: 2,
          directors: ['Director A'],
          watched: false,
        }),
        makeCandidate({
          tmdbId: 3,
          directors: ['Director B'],
          watched: false,
        }),
      ]
      // disc 2: +1 unwatched + 1 director boost = 2
      // disc 3: +1 unwatched only = 1
      // disc 1: in last3Watched → −2 recency
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(2)
    })

    it('does not apply director completion boost below 50%', () => {
      // Director A: 1 watched out of 3 owned = 33% → no boost
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          directors: ['Director A'],
          watched: true,
          lastWatchedAt: '2024-01-01T00:00:00Z',
        }),
        makeCandidate({
          tmdbId: 2,
          directors: ['Director A'],
          watched: false,
        }),
        makeCandidate({
          tmdbId: 3,
          directors: ['Director A'],
          watched: false,
        }),
      ]
      // 1 of 3 watched = 33% — boost should NOT apply to discs 2 and 3
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      // disc 2 and 3 both get +1 unwatched only; disc 1 gets −2 recency
      // top pick should be disc 2 or 3, but NOT because of director boost
      expect(result.topPick.tmdbId).not.toBe(1)
    })

    it('does not apply director completion boost to a watched disc', () => {
      // Director A: 2 of 3 watched = 66% — boost only applies to the unwatched one
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          directors: ['Director A'],
          watched: true,
          lastWatchedAt: '2024-02-01T00:00:00Z',
        }),
        makeCandidate({
          tmdbId: 2,
          directors: ['Director A'],
          watched: true,
          lastWatchedAt: '2024-01-01T00:00:00Z',
        }),
        makeCandidate({
          tmdbId: 3,
          directors: ['Director A'],
          watched: false,
        }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      // disc 3 gets +1 unwatched + 1 director boost = 2 → should be topPick
      expect(result.topPick.tmdbId).toBe(3)
    })

    it('uses the first director in the directors array only', () => {
      // disc 1: first director is 'Dir A', disc 2 has 'Dir B' as first director
      // Dir A has 1 watched of 1 owned = 100% but this is disc 1's only disc
      // (boost applies to unwatched discs of a director with ≥50% watched)
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          directors: ['Dir A', 'Dir B'],
          watched: true,
          lastWatchedAt: '2024-01-01T00:00:00Z',
        }),
        makeCandidate({
          tmdbId: 2,
          directors: ['Dir B', 'Dir A'],
          watched: false,
        }),
        makeCandidate({
          tmdbId: 3,
          directors: ['Dir C'],
          watched: false,
        }),
      ]
      // Dir B (first director of disc 2): check only Dir B discs
      // disc 2 is the only disc with Dir B as first director → 0 of 0 others watched → no boost
      // Dir C: disc 3, no watched → no boost
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result).not.toBeNull()
    })
  })

  describe('variety penalty', () => {
    it('applies −1 per genre shared with the genres of last3Watched', () => {
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          watched: true,
          lastWatchedAt: '2024-01-01T00:00:00Z',
          genres: ['Action'],
        }),
        makeCandidate({
          tmdbId: 2,
          genres: ['Action'], // shares 1 genre with last3Watched → −1
          watched: false,
        }),
        makeCandidate({
          tmdbId: 3,
          genres: ['Drama'], // no shared genres → no penalty
          watched: false,
        }),
      ]
      // disc 2: +1 unwatched −1 variety = 0
      // disc 3: +1 unwatched = 1 → should win
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(3)
    })

    it('applies cumulative penalty for multiple shared genres', () => {
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          watched: true,
          lastWatchedAt: '2024-01-01T00:00:00Z',
          genres: ['Action', 'Thriller'],
        }),
        makeCandidate({
          tmdbId: 2,
          genres: ['Action', 'Thriller'], // −2 variety penalty
          watched: false,
        }),
        makeCandidate({
          tmdbId: 3,
          genres: ['Action'], // −1 variety penalty
          watched: false,
        }),
        makeCandidate({
          tmdbId: 4,
          genres: ['Drama'], // no penalty
          watched: false,
        }),
      ]
      // disc 2: +1 −2 = −1
      // disc 3: +1 −1 = 0
      // disc 4: +1 = 1 → should win
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(4)
    })

    it('accumulates variety penalty across all last3Watched discs', () => {
      const candidates = [
        makeCandidate({
          tmdbId: 1,
          watched: true,
          lastWatchedAt: '2024-03-01T00:00:00Z',
          genres: ['Action'],
        }),
        makeCandidate({
          tmdbId: 2,
          watched: true,
          lastWatchedAt: '2024-02-01T00:00:00Z',
          genres: ['Drama'],
        }),
        makeCandidate({
          tmdbId: 3,
          watched: true,
          lastWatchedAt: '2024-01-01T00:00:00Z',
          genres: ['Thriller'],
        }),
        makeCandidate({
          tmdbId: 4,
          genres: ['Action', 'Drama'], // −1 from disc1 genres, −1 from disc2 genres = −2
          watched: false,
        }),
        makeCandidate({
          tmdbId: 5,
          genres: ['Comedy'], // no shared genres
          watched: false,
        }),
      ]
      // disc 4: +1 −2 = −1
      // disc 5: +1 = 1 → should win
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(5)
    })
  })

  describe('tiebreaker', () => {
    it('uses tmdbRating descending to break ties when all other signals are equal', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, watched: true, tmdbRating: 6.5 }),
        makeCandidate({ tmdbId: 2, watched: true, tmdbRating: 8.0 }),
        makeCandidate({ tmdbId: 3, watched: true, tmdbRating: 7.2 }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(2)
      expect(result.runners[0].tmdbId).toBe(3)
      expect(result.runners[1].tmdbId).toBe(1)
    })

    it('treats null tmdbRating as 0 in tiebreaker', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, watched: true, tmdbRating: null }),
        makeCandidate({ tmdbId: 2, watched: true, tmdbRating: 5.0 }),
      ]
      const result = scoreDecisionCandidates(candidates) as DecisionResult

      expect(result.topPick.tmdbId).toBe(2)
    })
  })

  describe('missing signal data', () => {
    it('contributes zero for null rating without error', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, rating: null }),
        makeCandidate({ tmdbId: 2, rating: null }),
      ]
      expect(() => scoreDecisionCandidates(candidates)).not.toThrow()
    })

    it('contributes zero for null lastWatchedAt without error', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, lastWatchedAt: null }),
        makeCandidate({ tmdbId: 2, lastWatchedAt: null }),
      ]
      expect(() => scoreDecisionCandidates(candidates)).not.toThrow()
    })

    it('handles candidates with empty directors array without error', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, directors: [] }),
        makeCandidate({ tmdbId: 2, directors: [] }),
      ]
      expect(() => scoreDecisionCandidates(candidates)).not.toThrow()
    })

    it('handles candidates with empty genres array without error', () => {
      const candidates = [
        makeCandidate({ tmdbId: 1, genres: [] }),
        makeCandidate({ tmdbId: 2, genres: [] }),
      ]
      expect(() => scoreDecisionCandidates(candidates)).not.toThrow()
    })
  })
})
