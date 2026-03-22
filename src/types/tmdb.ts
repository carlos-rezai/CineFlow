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
