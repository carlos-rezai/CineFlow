// TmdbCandidate is intentionally duplicated in server/src/types/index.ts.
// The frontend and backend type the same TMDB search shape independently so
// they can diverge freely as features evolve without introducing a shared-types
// build dependency.
export interface TmdbCandidate {
  tmdbId: number
  title: string
  year: number
  posterUrl: string
}

export interface TmdbMovieDetail {
  tmdbId: number
  title: string
  year: number
  posterUrl: string
  overview: string
  runtime: number
  genres: string[]
  directors: string[]
  cast: string[]
  tmdbRating: number
  cachedAt: string
}
