import { describe, it, expect } from 'vitest'
import {
  scoreCandidates,
  SHORT_RUNTIME_THRESHOLD,
  LONG_RUNTIME_MIN,
  RUNTIME_BONUS,
  type MoodAttributes,
  type MoodCandidate,
} from '../lib/scoreCandidates.js'

function makeCandidate(
  overrides: Partial<MoodCandidate> & { tmdbId: number },
): MoodCandidate {
  return {
    title: `Film ${overrides.tmdbId}`,
    year: 2020,
    posterUrl: '',
    genres: [],
    runtime: 120,
    directors: [],
    watched: false,
    watchCount: 0,
    lastWatchedAt: null,
    rating: null,
    ...overrides,
  }
}

describe('scoreCandidates()', () => {
  describe('constants', () => {
    it('SHORT_RUNTIME_THRESHOLD is 100', () => {
      expect(SHORT_RUNTIME_THRESHOLD).toBe(100)
    })

    it('LONG_RUNTIME_MIN is 150', () => {
      expect(LONG_RUNTIME_MIN).toBe(150)
    })

    it('RUNTIME_BONUS is 0.5', () => {
      expect(RUNTIME_BONUS).toBe(0.5)
    })
  })

  describe('sorting', () => {
    it('returns candidates sorted by score descending', () => {
      const attributes: MoodAttributes = {
        genres: { Action: 0.9, Drama: 0.3 },
        runtimePreference: 'any',
        preferUnwatched: false,
      }
      const candidates = [
        makeCandidate({ tmdbId: 1, genres: ['Drama'] }),           // genreScore 0.3
        makeCandidate({ tmdbId: 2, genres: ['Action', 'Drama'] }), // genreScore 1.2
        makeCandidate({ tmdbId: 3, genres: ['Action'] }),           // genreScore 0.9
      ]

      const result = scoreCandidates(attributes, candidates)

      expect(result.map((c) => c.tmdbId)).toEqual([2, 3, 1])
    })

    it('returns all scored candidates in order — caller slices for topPick and runners', () => {
      const attributes: MoodAttributes = {
        genres: { Action: 0.8 },
        runtimePreference: 'any',
        preferUnwatched: false,
      }
      const candidates = [
        makeCandidate({ tmdbId: 1, genres: ['Action'] }),
        makeCandidate({ tmdbId: 2, genres: ['Action'] }),
        makeCandidate({ tmdbId: 3, genres: ['Action'] }),
        makeCandidate({ tmdbId: 4, genres: ['Action'] }),
        makeCandidate({ tmdbId: 5, genres: ['Action'] }),
      ]

      const result = scoreCandidates(attributes, candidates)

      expect(result).toHaveLength(5)
    })
  })

  describe('genre scoring', () => {
    it('accumulates genre weights across all matching genres', () => {
      const attributes: MoodAttributes = {
        genres: { Action: 0.8, Thriller: 0.6, Drama: 0.4 },
        runtimePreference: 'any',
        preferUnwatched: false,
      }
      const multiGenre = makeCandidate({
        tmdbId: 1,
        genres: ['Action', 'Thriller', 'Drama'], // 0.8 + 0.6 + 0.4 = 1.8
      })
      const singleGenre = makeCandidate({
        tmdbId: 2,
        genres: ['Action'], // 0.8
      })

      const result = scoreCandidates(attributes, [multiGenre, singleGenre])

      expect(result[0].tmdbId).toBe(1)
      expect(result[1].tmdbId).toBe(2)
    })

    it('scores zero for genres that do not appear in MoodAttributes', () => {
      const attributes: MoodAttributes = {
        genres: { Action: 0.9 },
        runtimePreference: 'any',
        preferUnwatched: false,
      }
      const noMatch = makeCandidate({ tmdbId: 1, genres: ['Romance'] })
      const match = makeCandidate({ tmdbId: 2, genres: ['Action'] })

      const result = scoreCandidates(attributes, [noMatch, match])

      expect(result[0].tmdbId).toBe(2)
      expect(result[1].tmdbId).toBe(1)
    })
  })

  describe('runtimeBonus', () => {
    it('applies runtimeBonus when runtimePreference is short and runtime < 100', () => {
      const attributes: MoodAttributes = {
        genres: {},
        runtimePreference: 'short',
        preferUnwatched: false,
      }
      const shortFilm = makeCandidate({ tmdbId: 1, runtime: 90 })
      const longFilm = makeCandidate({ tmdbId: 2, runtime: 120 })

      const result = scoreCandidates(attributes, [longFilm, shortFilm])

      expect(result[0].tmdbId).toBe(1)
    })

    it('applies runtimeBonus when runtimePreference is long and runtime >= 150', () => {
      const attributes: MoodAttributes = {
        genres: {},
        runtimePreference: 'long',
        preferUnwatched: false,
      }
      const epicFilm = makeCandidate({ tmdbId: 1, runtime: 180 })
      const shortFilm = makeCandidate({ tmdbId: 2, runtime: 90 })

      const result = scoreCandidates(attributes, [shortFilm, epicFilm])

      expect(result[0].tmdbId).toBe(1)
    })

    describe('threshold edge cases', () => {
      it('99 min receives the short runtimeBonus', () => {
        const attributes: MoodAttributes = {
          genres: {},
          runtimePreference: 'short',
          preferUnwatched: false,
        }
        const at99 = makeCandidate({ tmdbId: 1, runtime: 99 })
        const at100 = makeCandidate({ tmdbId: 2, runtime: 100 })

        const result = scoreCandidates(attributes, [at100, at99])

        expect(result[0].tmdbId).toBe(1) // 99 < 100 → gets bonus
      })

      it('100 min does not receive the short runtimeBonus', () => {
        const attributes: MoodAttributes = {
          genres: {},
          runtimePreference: 'short',
          preferUnwatched: false,
        }
        const at99 = makeCandidate({ tmdbId: 1, runtime: 99 })
        const at100 = makeCandidate({ tmdbId: 2, runtime: 100 })

        const result = scoreCandidates(attributes, [at100, at99])

        expect(result[1].tmdbId).toBe(2) // 100 is not < 100 → no bonus
      })

      it('150 min receives the long runtimeBonus', () => {
        const attributes: MoodAttributes = {
          genres: {},
          runtimePreference: 'long',
          preferUnwatched: false,
        }
        const at150 = makeCandidate({ tmdbId: 1, runtime: 150 })
        const at149 = makeCandidate({ tmdbId: 2, runtime: 149 })

        const result = scoreCandidates(attributes, [at149, at150])

        expect(result[0].tmdbId).toBe(1) // 150 >= 150 → gets bonus
      })

      it('149 min does not receive the long runtimeBonus', () => {
        const attributes: MoodAttributes = {
          genres: {},
          runtimePreference: 'long',
          preferUnwatched: false,
        }
        const at150 = makeCandidate({ tmdbId: 1, runtime: 150 })
        const at149 = makeCandidate({ tmdbId: 2, runtime: 149 })

        const result = scoreCandidates(attributes, [at149, at150])

        expect(result[1].tmdbId).toBe(2) // 149 < 150 → no bonus
      })
    })
  })

  describe('preferUnwatched filter', () => {
    it('excludes watched discs before scoring when preferUnwatched is true', () => {
      const attributes: MoodAttributes = {
        genres: { Action: 0.9 },
        runtimePreference: 'any',
        preferUnwatched: true,
      }
      const watched = makeCandidate({ tmdbId: 1, genres: ['Action'], watched: true })
      const unwatched = makeCandidate({ tmdbId: 2, genres: ['Action'], watched: false })

      const result = scoreCandidates(attributes, [watched, unwatched])

      expect(result).toHaveLength(1)
      expect(result[0].tmdbId).toBe(2)
    })

    it('returns empty array when preferUnwatched is true and all candidates are watched', () => {
      const attributes: MoodAttributes = {
        genres: { Action: 0.9 },
        runtimePreference: 'any',
        preferUnwatched: true,
      }
      const candidates = [
        makeCandidate({ tmdbId: 1, genres: ['Action'], watched: true }),
        makeCandidate({ tmdbId: 2, genres: ['Action'], watched: true }),
      ]

      const result = scoreCandidates(attributes, candidates)

      expect(result).toHaveLength(0)
    })

    it('includes watched discs when preferUnwatched is false', () => {
      const attributes: MoodAttributes = {
        genres: { Action: 0.9 },
        runtimePreference: 'any',
        preferUnwatched: false,
      }
      const watched = makeCandidate({ tmdbId: 1, genres: ['Action'], watched: true })
      const unwatched = makeCandidate({ tmdbId: 2, genres: ['Action'], watched: false })

      const result = scoreCandidates(attributes, [watched, unwatched])

      expect(result).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('returns empty array when given no candidates', () => {
      const attributes: MoodAttributes = {
        genres: { Action: 0.9 },
        runtimePreference: 'any',
        preferUnwatched: false,
      }

      const result = scoreCandidates(attributes, [])

      expect(result).toHaveLength(0)
    })

    it('returns fewer than 4 candidates without error', () => {
      const attributes: MoodAttributes = {
        genres: { Action: 0.9 },
        runtimePreference: 'any',
        preferUnwatched: false,
      }
      const candidates = [
        makeCandidate({ tmdbId: 1, genres: ['Action'] }),
        makeCandidate({ tmdbId: 2, genres: ['Action'] }),
        makeCandidate({ tmdbId: 3, genres: ['Action'] }),
      ]

      const result = scoreCandidates(attributes, candidates)

      expect(result).toHaveLength(3)
    })
  })
})
