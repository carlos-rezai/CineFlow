import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MoodFrame } from '../../types/mood'
import { ndjsonStream } from '../ndjsonStream'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

function streamResponse(chunks: string[]) {
  return Promise.resolve({ ok: true, body: makeStream(chunks) })
}

function errorResponse() {
  return Promise.resolve({ ok: false, status: 500, body: null })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('ndjsonStream()', () => {
  it('yields parsed MoodFrame objects from a single-chunk NDJSON response', async () => {
    const lines =
      [
        JSON.stringify({ type: 'result', topPick: { tmdbId: 1 }, runners: [] }),
        JSON.stringify({ type: 'token', text: 'Hello ' }),
        JSON.stringify({ type: 'done' }),
      ].join('\n') + '\n'
    mockFetch.mockReturnValueOnce(streamResponse([lines]))

    const frames: MoodFrame[] = []
    for await (const frame of ndjsonStream('/api/test')) {
      frames.push(frame)
    }

    expect(frames).toHaveLength(3)
    expect(frames[0].type).toBe('result')
    expect(frames[1].type).toBe('token')
    expect(frames[2].type).toBe('done')
  })

  it('assembles frames split across two chunks where first chunk ends mid-line', async () => {
    const line = JSON.stringify({ type: 'token', text: 'world' })
    const chunk1 = line.slice(0, 10)
    const chunk2 = line.slice(10) + '\n'
    mockFetch.mockReturnValueOnce(streamResponse([chunk1, chunk2]))

    const frames: MoodFrame[] = []
    for await (const frame of ndjsonStream('/api/test')) {
      frames.push(frame)
    }

    expect(frames).toHaveLength(1)
    expect(frames[0]).toEqual({ type: 'token', text: 'world' })
  })

  it('throws when fetch rejects (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'))

    await expect(async () => {
      for await (const _ of ndjsonStream('/api/test')) {
        // should not reach here
      }
    }).rejects.toThrow('Network failure')
  })

  it('throws when response is non-ok', async () => {
    mockFetch.mockReturnValueOnce(errorResponse())

    await expect(async () => {
      for await (const _ of ndjsonStream('/api/test')) {
        // should not reach here
      }
    }).rejects.toThrow()
  })

  it('throws when res.body is null', async () => {
    mockFetch.mockReturnValueOnce(Promise.resolve({ ok: true, body: null }))

    await expect(async () => {
      for await (const _ of ndjsonStream('/api/test')) {
        // should not reach here
      }
    }).rejects.toThrow()
  })

  it('silently skips malformed lines without throwing', async () => {
    const lines = 'not-valid-json\n' + JSON.stringify({ type: 'done' }) + '\n'
    mockFetch.mockReturnValueOnce(streamResponse([lines]))

    const frames: MoodFrame[] = []
    for await (const frame of ndjsonStream('/api/test')) {
      frames.push(frame)
    }

    expect(frames).toHaveLength(1)
    expect(frames[0].type).toBe('done')
  })
})
