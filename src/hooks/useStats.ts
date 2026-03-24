import { useState, useEffect } from 'react'
import { apiGet } from '../lib/api'
import type { CollectionStats } from '../types/stats'

export interface UseStatsResult {
  stats: CollectionStats | null
  loading: boolean
}

export function useStats(refreshToken: number): UseStatsResult {
  const [stats, setStats] = useState<CollectionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiGet<CollectionStats>('/api/stats')
      .then((data) => {
        if (!cancelled) {
          setStats(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats(null)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [refreshToken])

  return { stats, loading }
}
