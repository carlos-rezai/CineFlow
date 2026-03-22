import { useState, useEffect } from 'react'
import type { DiscSummary } from '../types/disc'
import type { TmdbMovieDetail } from '../types/tmdb'

export interface UseDiscResult {
  disc: DiscSummary | null
  tmdbMovie: TmdbMovieDetail | null
  loading: boolean
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function useDisc(id: string): UseDiscResult {
  const [disc, setDisc] = useState<DiscSummary | null>(null)
  const [tmdbMovie, setTmdbMovie] = useState<TmdbMovieDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/discs/${id}`)
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data = (await res.json()) as {
        disc: DiscSummary
        tmdbMovie: TmdbMovieDetail
      }
      setDisc(data.disc)
      setTmdbMovie(data.tmdbMovie)
      setLoading(false)
    })()
  }, [id])

  return { disc, tmdbMovie, loading }
}
