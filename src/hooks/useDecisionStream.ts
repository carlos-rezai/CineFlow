import { useState, useCallback } from 'react'
import type { MoodCandidate, MoodStatus } from '../types/mood'

export interface UseDecisionStreamResult {
  status: MoodStatus
  topPick: MoodCandidate | null
  runners: MoodCandidate[]
  explanation: string
  run: () => void
}

export function useDecisionStream(): UseDecisionStreamResult {
  const [status] = useState<MoodStatus>('idle')
  const [topPick] = useState<MoodCandidate | null>(null)
  const [runners] = useState<MoodCandidate[]>([])
  const [explanation] = useState('')

  const run = useCallback(() => {}, [])

  return { status, topPick, runners, explanation, run }
}
