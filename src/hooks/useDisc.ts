import { useState, useEffect } from 'react'
import type { DiscSummary } from '../types/disc'
import type { TmdbMovieDetail } from '../types/tmdb'

export interface UseDiscResult {
  disc: DiscSummary | null
  tmdbMovie: TmdbMovieDetail | null
  loading: boolean
  toast: string | null
  notesError: boolean
  deleteError: string | null
  toggleWatched: () => Promise<void>
  setRating: (rating: 1 | 2 | 3 | 4 | 5 | null) => Promise<void>
  saveNotes: (notes: string) => Promise<void>
  deleteDisc: () => Promise<void>
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function useDisc(id: string, onDelete?: () => void): UseDiscResult {
  const [disc, setDisc] = useState<DiscSummary | null>(null)
  const [tmdbMovie, setTmdbMovie] = useState<TmdbMovieDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [notesError, setNotesError] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 1500)
  }

  const toggleWatched = async () => {
    if (!disc) return
    const prev = disc
    const now = new Date().toISOString()
    const next: DiscSummary = disc.watched
      ? { ...disc, watched: false }
      : {
          ...disc,
          watched: true,
          watchCount: disc.watchCount + 1,
          lastWatchedAt: now,
        }
    setDisc(next)
    const patch = disc.watched
      ? { watched: false }
      : { watched: true, watchCount: next.watchCount, lastWatchedAt: now }
    const res = await fetch(`${API_BASE}/api/discs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      setDisc(prev)
      showToast('Failed to save — changes reverted')
    }
  }

  const setRating = async (rating: 1 | 2 | 3 | 4 | 5 | null) => {
    if (!disc) return
    const prev = disc
    setDisc({ ...disc, rating })
    const res = await fetch(`${API_BASE}/api/discs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    })
    if (!res.ok) {
      setDisc(prev)
      showToast('Failed to save — changes reverted')
    }
  }

  const saveNotes = async (notes: string) => {
    setNotesError(false)
    const res = await fetch(`${API_BASE}/api/discs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    if (res.ok) {
      if (disc) setDisc({ ...disc, notes })
      showToast('Saved')
    } else {
      setNotesError(true)
    }
  }

  const deleteDisc = async () => {
    setDeleteError(null)
    const res = await fetch(`${API_BASE}/api/discs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      onDelete?.()
    } else {
      setDeleteError('Failed to delete disc')
    }
  }

  return {
    disc,
    tmdbMovie,
    loading,
    toast,
    notesError,
    deleteError,
    toggleWatched,
    setRating,
    saveNotes,
    deleteDisc,
  }
}
