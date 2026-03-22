import type { TmdbCandidate, TMDBMovieInput } from '../types/index.js'

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

interface TmdbMovieDetails {
  id: number
  title: string
  release_date: string
  poster_path: string | null
  overview: string
  runtime: number
  genres: { name: string }[]
  credits: {
    crew: { job: string; name: string }[]
    cast: { name: string }[]
  }
  vote_average: number
}

interface TmdbSearchResult {
  id: number
  title: string
  release_date: string
  poster_path: string | null
}

interface TmdbSearchResponse {
  results: TmdbSearchResult[]
}

export async function getTmdbMovieDetails(
  tmdbId: number,
): Promise<TMDBMovieInput | null> {
  const apiKey = process.env.TMDB_API_KEY ?? ''
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=credits&api_key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as TmdbMovieDetails
  return {
    tmdbId: data.id,
    title: data.title,
    year: new Date(data.release_date).getFullYear(),
    posterUrl: data.poster_path ? `${POSTER_BASE}${data.poster_path}` : '',
    overview: data.overview,
    runtime: data.runtime,
    genres: data.genres.map((g) => g.name),
    directors: data.credits.crew
      .filter((c) => c.job === 'Director')
      .map((c) => c.name),
    cast: data.credits.cast.slice(0, 10).map((c) => c.name),
    tmdbRating: data.vote_average,
    cachedAt: new Date().toISOString(),
  }
}

export async function searchTmdb(title: string): Promise<TmdbCandidate[]> {
  const apiKey = process.env.TMDB_API_KEY ?? ''
  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${apiKey}`
  const res = await fetch(url)
  const data = (await res.json()) as TmdbSearchResponse
  return data.results.map((r) => ({
    tmdbId: r.id,
    title: r.title,
    year: new Date(r.release_date).getFullYear(),
    posterUrl: r.poster_path ? `${POSTER_BASE}${r.poster_path}` : '',
  }))
}
