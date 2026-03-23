import type { ObjectId } from 'mongodb'

export interface Disc {
  _id: ObjectId
  barcode: string
  format: '4K' | 'Blu-ray' | 'DVD'
  addedAt: string
  tmdbId: number
  watched: boolean
  lastWatchedAt: string | null
  watchCount: number
  rating: 1 | 2 | 3 | 4 | 5 | null
  notes: string | null
}

export interface TMDBMovie {
  _id: ObjectId
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

// TmdbCandidate is intentionally duplicated in src/types/tmdb.ts.
// The frontend and backend type the same TMDB search shape independently so
// they can diverge freely as features evolve without introducing a shared-types
// build dependency.
export interface TmdbCandidate {
  tmdbId: number
  title: string
  year: number
  posterUrl: string
}

export type CreateDiscInput = {
  barcode: string
  format: '4K' | 'Blu-ray' | 'DVD'
  tmdbId: number
}

export type DiscPatch = Partial<
  Pick<Disc, 'watched' | 'lastWatchedAt' | 'watchCount' | 'rating' | 'notes'>
>

export type TMDBMovieInput = Omit<TMDBMovie, '_id'>

export type DiscListItem = Disc & {
  posterUrl: string
  title: string
}
