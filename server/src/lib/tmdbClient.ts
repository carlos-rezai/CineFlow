import type { TmdbCandidate } from '../types/index.js'

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

interface TmdbSearchResult {
  id: number
  title: string
  release_date: string
  poster_path: string | null
}

interface TmdbSearchResponse {
  results: TmdbSearchResult[]
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
