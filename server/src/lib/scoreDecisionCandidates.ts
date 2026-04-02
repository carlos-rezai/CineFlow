import type { MoodCandidate } from '../../../ai/types/mood.js'

export interface DecisionResult {
  topPick: MoodCandidate
  runners: MoodCandidate[]
  reasons: string[]
  last3Watched: MoodCandidate[]
}

export function scoreDecisionCandidates(
  candidates: MoodCandidate[],
): DecisionResult | null {
  if (candidates.length === 0) return null

  const last3Watched = candidates
    .filter((c) => c.watched && c.lastWatchedAt !== null)
    .sort((a, b) =>
      (b.lastWatchedAt ?? '').localeCompare(a.lastWatchedAt ?? ''),
    )
    .slice(0, 3)

  const last3WatchedIds = new Set(last3Watched.map((c) => c.tmdbId))
  const last3Genres = new Set(last3Watched.flatMap((c) => c.genres))

  const directorStats = new Map<string, { total: number; watched: number }>()
  for (const c of candidates) {
    if (c.directors.length === 0) continue
    const dir = c.directors[0]
    const stats = directorStats.get(dir) ?? { total: 0, watched: 0 }
    stats.total++
    if (c.watched) stats.watched++
    directorStats.set(dir, stats)
  }

  const scored = candidates.map((c) => {
    let score = 0
    const reasons: string[] = []

    if (last3WatchedIds.has(c.tmdbId)) {
      score -= 2
      reasons.push('watched recently')
    }

    if (c.rating === 4 || c.rating === 5) {
      score += 2
      reasons.push(`highly rated (${c.rating} stars)`)
    }

    if (!c.watched) {
      score += 1
      reasons.push('not yet watched')
    }

    if (!c.watched && c.directors.length > 0) {
      const dir = c.directors[0]
      const stats = directorStats.get(dir)
      if (stats && stats.total > 1 && stats.watched / stats.total >= 0.5) {
        score += 1
        reasons.push(
          `director completion — ${stats.watched} of ${stats.total} ${dir} films watched`,
        )
      }
    }

    const sharedGenres = c.genres.filter((g) => last3Genres.has(g))
    if (sharedGenres.length > 0) {
      score -= sharedGenres.length
      reasons.push(`genre overlap — ${sharedGenres.join(', ')}`)
    }

    return { candidate: c, score, reasons }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (b.candidate.tmdbRating ?? 0) - (a.candidate.tmdbRating ?? 0)
  })

  const topPickEntry = scored[0]
  const reasons =
    topPickEntry.reasons.length > 0
      ? topPickEntry.reasons
      : ['selected from collection']

  return {
    topPick: topPickEntry.candidate,
    runners: scored.slice(1, 4).map((s) => s.candidate),
    reasons,
    last3Watched,
  }
}
