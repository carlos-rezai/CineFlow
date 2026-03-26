export const SHORT_RUNTIME_THRESHOLD = 100
export const LONG_RUNTIME_MIN = 150
export const RUNTIME_BONUS = 0.5

export interface MoodAttributes {
  genres: Record<string, number>
  runtimePreference: 'short' | 'any' | 'long'
  preferUnwatched: boolean
}

export interface MoodCandidate {
  tmdbId: number
  title: string
  year: number
  posterUrl: string
  genres: string[]
  runtime: number
  directors: string[]
  watched: boolean
  watchCount: number
  lastWatchedAt: string | null
  rating: 1 | 2 | 3 | 4 | 5 | null
}

function getRuntimeBonus(
  runtime: number,
  runtimePreference: MoodAttributes['runtimePreference'],
): number {
  if (runtimePreference === 'short' && runtime < SHORT_RUNTIME_THRESHOLD) {
    return RUNTIME_BONUS
  }
  if (runtimePreference === 'long' && runtime >= LONG_RUNTIME_MIN) {
    return RUNTIME_BONUS
  }
  return 0
}

export function scoreCandidates(
  attributes: MoodAttributes,
  candidates: MoodCandidate[],
): MoodCandidate[] {
  const pool = attributes.preferUnwatched
    ? candidates.filter((c) => !c.watched)
    : candidates

  return pool
    .map((candidate) => {
      const genreScore = candidate.genres.reduce(
        (sum, genre) => sum + (attributes.genres[genre] ?? 0),
        0,
      )
      const runtimeBonus = getRuntimeBonus(
        candidate.runtime,
        attributes.runtimePreference,
      )
      return { candidate, score: genreScore + runtimeBonus }
    })
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => candidate)
}
