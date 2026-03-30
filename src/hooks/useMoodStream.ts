import { useState, useCallback } from 'react'

export interface MoodCandidate {
  tmdbId: number
  title: string
  year: number
  posterUrl: string
  genres: string[]
  runtime: number
  directors: string[]
  watched: boolean
  watchCount: number
  lastWatchedAt: string | null
  rating: 1 | 2 | 3 | 4 | 5 | null
}

export interface MoodInput {
  tags: string[]
  freeText: string
}

export type MoodStatus = 'idle' | 'loading' | 'result' | 'empty' | 'error'

type MoodFrame =
  | { type: 'result'; topPick: MoodCandidate; runners: MoodCandidate[] }
  | { type: 'token'; text: string }
  | { type: 'done' }
  | { type: 'empty' }
  | { type: 'error'; message: string }

export interface UseMoodStreamResult {
  status: MoodStatus
  topPick: MoodCandidate | null
  runners: MoodCandidate[]
  explanation: string
  submit: (input: MoodInput) => void
  reset: () => void
}

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
      let res: Response
      try {
        res = await fetch(`${API_BASE}/api/mood`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
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
            // 'done': stream complete, no state change needed
            // 'error' after result: explanation failed, topPick/runners preserved
          } catch {
            // malformed frame — skip
          }
        }
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
