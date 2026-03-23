import { useState, useEffect } from 'react'
import type { DiscSummary } from '../types/disc'
import type { TmdbMovieDetail } from '../types/tmdb'
import { apiGet, apiPatch, apiDelete } from '../lib/api'

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

export function useDisc(
  id: string,
  onDelete?: () => void,
  onWatchedToggle?: () => void,
): UseDiscResult {
  const [disc, setDisc] = useState<DiscSummary | null>(null)
  const [tmdbMovie, setTmdbMovie] = useState<TmdbMovieDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [notesError, setNotesError] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const data = await apiGet<{
          disc: DiscSummary
          tmdbMovie: TmdbMovieDetail
        }>(`/api/discs/${id}`)
        setDisc(data.disc)
        setTmdbMovie(data.tmdbMovie)
      } catch {
        // leave disc null, loading stops
      } finally {
        setLoading(false)
      }
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
    try {
      await apiPatch(`/api/discs/${id}`, patch)
      onWatchedToggle?.()
    } catch {
      setDisc(prev)
      showToast('Failed to save — changes reverted')
    }
  }

  const setRating = async (rating: 1 | 2 | 3 | 4 | 5 | null) => {
    if (!disc) return
    const prev = disc
    setDisc({ ...disc, rating })
    try {
      await apiPatch(`/api/discs/${id}`, { rating })
    } catch {
      setDisc(prev)
      showToast('Failed to save — changes reverted')
    }
  }

  const saveNotes = async (notes: string) => {
    setNotesError(false)
    try {
      await apiPatch(`/api/discs/${id}`, { notes })
      if (disc) setDisc({ ...disc, notes })
      showToast('Saved')
    } catch {
      setNotesError(true)
    }
  }

  const deleteDisc = async () => {
    setDeleteError(null)
    try {
      await apiDelete(`/api/discs/${id}`)
      onDelete?.()
    } catch {
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
