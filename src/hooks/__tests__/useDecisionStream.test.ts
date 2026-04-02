// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

afterEach(() => vi.unstubAllGlobals())

import { useDecisionStream } from '../useDecisionStream'

const makeCandidate = (overrides: Record<string, unknown> = {}) => ({
  tmdbId: 335984,
  title: 'Blade Runner 2049',
  year: 2017,
  posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
  genres: ['Science Fiction'],
  runtime: 164,
  directors: ['Denis Villeneuve'],
  watched: false,
  watchCount: 0,
  lastWatchedAt: null,
  rating: null,
  ...overrides,
})

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

function mockFetch(chunks: string[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, body: makeStream(chunks) }),
  )
}

describe('useDecisionStream', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useDecisionStream())

    expect(result.current.status).toBe('idle')
    expect(result.current.topPick).toBeNull()
    expect(result.current.runners).toEqual([])
    expect(result.current.explanation).toBe('')
  })

  it('run() sends POST to /api/decision with no request body', async () => {
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      body: makeStream([JSON.stringify({ type: 'empty' }) + '\n']),
    })
    vi.stubGlobal('fetch', mockFetchFn)

    const { result } = renderHook(() => useDecisionStream())
    act(() => result.current.run())

    await waitFor(() => expect(result.current.status).toBe('empty'))

    expect(mockFetchFn).toHaveBeenCalledOnce()
    const [url, options] = mockFetchFn.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/decision')
    expect(options.method).toBe('POST')
  })

  it('sets topPick, runners, and status to result when result frame arrives', async () => {
    const candidate = makeCandidate({ title: 'Dune' })
    const runner = makeCandidate({ title: 'Arrival', tmdbId: 313369 })
    mockFetch([
      JSON.stringify({
        type: 'result',
        topPick: candidate,
        runners: [runner],
        reasons: ['not yet watched'],
        last3Watched: [],
      }) + '\n',
      JSON.stringify({ type: 'done' }) + '\n',
    ])

    const { result } = renderHook(() => useDecisionStream())
    act(() => result.current.run())

    await waitFor(() => expect(result.current.status).toBe('result'))
    expect(result.current.topPick?.title).toBe('Dune')
    expect(result.current.runners).toHaveLength(1)
    expect(result.current.runners[0].title).toBe('Arrival')
  })

  it('sets status to empty and leaves topPick null when empty frame arrives', async () => {
    mockFetch([JSON.stringify({ type: 'empty' }) + '\n'])

    const { result } = renderHook(() => useDecisionStream())
    act(() => result.current.run())

    await waitFor(() => expect(result.current.status).toBe('empty'))
    expect(result.current.topPick).toBeNull()
  })

  it('sets status to loading while stream is in progress', async () => {
    const candidate = makeCandidate()
    mockFetch([
      JSON.stringify({
        type: 'result',
        topPick: candidate,
        runners: [],
        reasons: [],
        last3Watched: [],
      }) + '\n',
      JSON.stringify({ type: 'done' }) + '\n',
    ])

    const { result } = renderHook(() => useDecisionStream())
    act(() => result.current.run())

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('result'))
  })

  it('reassembles a result frame split across two chunks', async () => {
    const candidate = makeCandidate({ title: 'Dune' })
    const fullLine =
      JSON.stringify({
        type: 'result',
        topPick: candidate,
        runners: [],
        reasons: [],
        last3Watched: [],
      }) + '\n'
    const splitAt = Math.floor(fullLine.length / 2)
    mockFetch([
      fullLine.slice(0, splitAt),
      fullLine.slice(splitAt) + JSON.stringify({ type: 'done' }) + '\n',
    ])

    const { result } = renderHook(() => useDecisionStream())
    act(() => result.current.run())

    await waitFor(() => expect(result.current.status).toBe('result'))
    expect(result.current.topPick?.title).toBe('Dune')
  })

  it('parses multiple frames delivered in a single chunk', async () => {
    const candidate = makeCandidate()
    const singleChunk =
      JSON.stringify({
        type: 'result',
        topPick: candidate,
        runners: [],
        reasons: [],
        last3Watched: [],
      }) +
      '\n' +
      JSON.stringify({ type: 'done' }) +
      '\n'
    mockFetch([singleChunk])

    const { result } = renderHook(() => useDecisionStream())
    act(() => result.current.run())

    await waitFor(() => expect(result.current.status).toBe('result'))
    expect(result.current.topPick?.tmdbId).toBe(335984)
  })

  it('sets status to error when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    )

    const { result } = renderHook(() => useDecisionStream())
    act(() => result.current.run())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.topPick).toBeNull()
  })

  it('accumulates token frames into the explanation string', async () => {
    const candidate = makeCandidate()
    mockFetch([
      JSON.stringify({
        type: 'result',
        topPick: candidate,
        runners: [],
        reasons: [],
        last3Watched: [],
      }) + '\n',
      JSON.stringify({ type: 'token', text: 'A compelling ' }) + '\n',
      JSON.stringify({ type: 'token', text: 'choice.' }) + '\n',
      JSON.stringify({ type: 'done' }) + '\n',
    ])

    const { result } = renderHook(() => useDecisionStream())
    act(() => result.current.run())

    await waitFor(() =>
      expect(result.current.explanation).toBe('A compelling choice.'),
    )
  })

  it('preserves topPick and runners when error frame follows result frame', async () => {
    const candidate = makeCandidate({ title: 'Dune' })
    mockFetch([
      JSON.stringify({
        type: 'result',
        topPick: candidate,
        runners: [],
        reasons: [],
        last3Watched: [],
      }) + '\n',
      JSON.stringify({ type: 'error', message: 'Explanation failed' }) + '\n',
    ])

    const { result } = renderHook(() => useDecisionStream())
    act(() => result.current.run())

    await waitFor(() => expect(result.current.status).toBe('result'))
    expect(result.current.topPick?.title).toBe('Dune')
    expect(result.current.runners).toEqual([])
  })
})
