import type { MoodAttributes, MoodCandidate } from '../../../ai/types/mood.js'

export type { MoodAttributes, MoodCandidate }

export const SHORT_RUNTIME_THRESHOLD = 100
export const LONG_RUNTIME_MIN = 150
export const RUNTIME_BONUS = 0.5

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
