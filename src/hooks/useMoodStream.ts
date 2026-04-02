import { useState, useCallback } from 'react'
import type {
  MoodCandidate,
  MoodInput,
  MoodStatus,
  UseMoodStreamResult,
} from '../types/mood'
import { ndjsonStream } from '../lib/ndjsonStream'

export type { MoodCandidate, MoodInput, MoodStatus, UseMoodStreamResult }

export function useMoodStream(): UseMoodStreamResult {
  const [status, setStatus] = useState<MoodStatus>('idle')
  const [topPick, setTopPick] = useState<MoodCandidate | null>(null)
  const [runners, setRunners] = useState<MoodCandidate[]>([])
  const [explanation, setExplanation] = useState('')

  const submit = useCallback((input: MoodInput) => {
    setStatus('loading')
    setTopPick(null)
    setRunners([])
    setExplanation('')

    const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

    void (async () => {
      try {
        for await (const frame of ndjsonStream(`${API_BASE}/api/mood`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
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
          // 'done': stream complete, no state change needed
          // 'error' after result: explanation failed, topPick/runners preserved
        }
      } catch {
        setStatus('error')
      }
    })()
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setTopPick(null)
    setRunners([])
    setExplanation('')
  }, [])

  return { status, topPick, runners, explanation, submit, reset }
}
