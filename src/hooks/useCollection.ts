import { useState, useEffect, useCallback, useRef } from 'react'
import type { DiscSummary } from '../types/disc'
import { apiGet } from '../lib/api'

export type WatchedFilter = 'all' | 'watched' | 'unwatched'

export interface UseCollectionResult {
  discs: DiscSummary[]
  loading: boolean
  filter: WatchedFilter
  setFilter: (f: WatchedFilter) => void
  refresh: () => void
}

export function useCollection(): UseCollectionResult {
  const [discs, setDiscs] = useState<DiscSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<WatchedFilter>('all')
  const fetchVersion = useRef(0)

  const fetchDiscs = useCallback(async () => {
    const version = ++fetchVersion.current
    setLoading(true)
    const params = filter === 'all' ? '' : `?watched=${filter === 'watched'}`
    try {
      const data = await apiGet<DiscSummary[]>(`/api/discs${params}`)
      if (version === fetchVersion.current) {
        setDiscs(data)
        setLoading(false)
      }
    } catch {
      if (version === fetchVersion.current) {
        setLoading(false)
      }
    }
  }, [filter])

  useEffect(() => {
    void fetchDiscs()
  }, [fetchDiscs])

  return { discs, loading, filter, setFilter, refresh: fetchDiscs }
}
