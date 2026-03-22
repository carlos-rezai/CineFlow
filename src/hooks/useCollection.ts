import { useState, useEffect, useCallback, useRef } from 'react'
import type { DiscSummary } from '../types/disc'

export type WatchedFilter = 'all' | 'watched' | 'unwatched'

export interface UseCollectionResult {
  discs: DiscSummary[]
  loading: boolean
  filter: WatchedFilter
  setFilter: (f: WatchedFilter) => void
  refresh: () => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function useCollection(): UseCollectionResult {
  const [discs, setDiscs] = useState<DiscSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<WatchedFilter>('all')
  const fetchVersion = useRef(0)

  const fetchDiscs = useCallback(async () => {
    const version = ++fetchVersion.current
    setLoading(true)
    const params = filter === 'all' ? '' : `?watched=${filter === 'watched'}`
    const res = await fetch(`${API_BASE}/api/discs${params}`)
    const data = (await res.json()) as DiscSummary[]
    if (version === fetchVersion.current) {
      setDiscs(data)
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void fetchDiscs()
  }, [fetchDiscs])

  return { discs, loading, filter, setFilter, refresh: fetchDiscs }
}
