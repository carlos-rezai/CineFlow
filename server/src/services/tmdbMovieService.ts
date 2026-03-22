import { getDb } from '../lib/db.js'
import { getTmdbMovieDetails } from '../lib/tmdbClient.js'
import type { TMDBMovie, TMDBMovieInput } from '../types/index.js'

const STALE_THRESHOLD_DAYS = 30

export async function refreshIfStale(tmdbId: number): Promise<void> {
  const db = getDb()
  const movie = await db
    .collection<TMDBMovie>('tmdb_movies')
    .findOne({ tmdbId })
  if (!movie) return
  const cachedAt = new Date(movie.cachedAt)
  const ageMs = Date.now() - cachedAt.getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  if (ageDays < STALE_THRESHOLD_DAYS) return
  const fresh = await getTmdbMovieDetails(tmdbId)
  if (!fresh) return
  await upsertTmdbMovie(fresh)
}

export async function upsertTmdbMovie(
  data: TMDBMovieInput,
): Promise<TMDBMovie> {
  const db = getDb()
  const result = await db
    .collection<TMDBMovie>('tmdb_movies')
    .findOneAndUpdate(
      { tmdbId: data.tmdbId },
      { $set: data },
      { upsert: true, returnDocument: 'after' },
    )
  return result as TMDBMovie
}
