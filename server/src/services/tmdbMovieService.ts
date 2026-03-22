import { getDb } from '../lib/db.js'
import type { TMDBMovie, TMDBMovieInput } from '../types/index.js'

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
