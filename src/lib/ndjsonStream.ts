import type { MoodFrame } from '../types/mood'

export async function* ndjsonStream(
  url: string,
  options?: RequestInit,
): AsyncGenerator<MoodFrame> {
  const res = await fetch(url, options)

  if (!res.ok) throw new Error(`NDJSON request failed: ${res.status}`)
  if (!res.body) throw new Error('NDJSON response has no body')

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
        yield JSON.parse(line) as MoodFrame
      } catch {
        // malformed frame — skip
      }
    }
  }
}
