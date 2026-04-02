import { useState, useCallback } from 'react'
import type { MoodCandidate, MoodStatus, MoodFrame } from '../types/mood'

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
      let res: Response
      try {
        res = await fetch(`${API_BASE}/api/decision`, {
          method: 'POST',
        })
      } catch {
        setStatus('error')
        return
      }

      if (!res.ok || !res.body) {
        setStatus('error')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        let newlineIdx: number
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim()
          buffer = buffer.slice(newlineIdx + 1)
          if (!line) continue

          try {
            const frame = JSON.parse(line) as MoodFrame

            if (frame.type === 'result') {
              setTopPick(frame.topPick)
              setRunners(frame.runners)
              setStatus('result')
            } else if (frame.type === 'token') {
              setExplanation((prev) => prev + frame.text)
            } else if (frame.type === 'empty') {
              setStatus('empty')
            }
          } catch {
            // malformed frame — skip
          }
        }
      }
    })()
  }, [])

  return { status, topPick, runners, explanation, run }
}
