import { useState, useCallback } from 'react'
import type { MoodCandidate, MoodStatus } from '../types/mood'
import { ndjsonStream } from '../lib/ndjsonStream'

export interface UseDecisionStreamResult {
  status: MoodStatus
  topPick: MoodCandidate | null
  runners: MoodCandidate[]
  explanation: string
  run: () => void
}

export function useDecisionStream(): UseDecisionStreamResult {
  const [status, setStatus] = useState<MoodStatus>('idle')
  const [topPick, setTopPick] = useState<MoodCandidate | null>(null)
  const [runners, setRunners] = useState<MoodCandidate[]>([])
  const [explanation, setExplanation] = useState('')

  const run = useCallback(() => {
    setStatus('loading')
    setTopPick(null)
    setRunners([])
    setExplanation('')

    const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

    void (async () => {
      try {
        for await (const frame of ndjsonStream(`${API_BASE}/api/decision`, {
          method: 'POST',
        })) {
          if (frame.type === 'result') {
            setTopPick(frame.topPick)
            setRunners(frame.runners)
            setStatus('result')
          } else if (frame.type === 'token') {
            setExplanation((prev) => prev + frame.text)
          } else if (frame.type === 'empty') {
            setStatus('empty')
          }
        }
      } catch {
        setStatus('error')
      }
    })()
  }, [])

  return { status, topPick, runners, explanation, run }
}
