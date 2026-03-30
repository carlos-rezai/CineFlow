// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

afterEach(() => vi.unstubAllGlobals())

import { useMoodStream } from '../useMoodStream'

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

describe('useMoodStream', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useMoodStream())
    expect(result.current.status).toBe('idle')
    expect(result.current.topPick).toBeNull()
    expect(result.current.runners).toEqual([])
    expect(result.current.explanation).toBe('')
  })

  it('sets topPick, runners, and status to result when result frame arrives', async () => {
    const candidate = makeCandidate({ title: 'Dune' })
    const runner = makeCandidate({ title: 'Arrival', tmdbId: 313369 })
    mockFetch([
      JSON.stringify({ type: 'result', topPick: candidate, runners: [runner] }) + '\n',
      JSON.stringify({ type: 'done' }) + '\n',
    ])

    const { result } = renderHook(() => useMoodStream())
    act(() => result.current.submit({ tags: ['Intense'], freeText: '' }))

    await waitFor(() => expect(result.current.status).toBe('result'))
    expect(result.current.topPick?.title).toBe('Dune')
    expect(result.current.runners).toHaveLength(1)
    expect(result.current.runners[0].title).toBe('Arrival')
  })

  it('accumulates token frames into explanation string', async () => {
    const candidate = makeCandidate()
    mockFetch([
      JSON.stringify({ type: 'result', topPick: candidate, runners: [] }) + '\n',
      JSON.stringify({ type: 'token', text: 'A visually ' }) + '\n',
      JSON.stringify({ type: 'token', text: 'stunning film.' }) + '\n',
      JSON.stringify({ type: 'done' }) + '\n',
    ])

    const { result } = renderHook(() => useMoodStream())
    act(() => result.current.submit({ tags: ['Cozy'], freeText: '' }))

    await waitFor(() =>
      expect(result.current.explanation).toBe('A visually stunning film.'),
    )
  })

  it('sets status to empty and leaves topPick null when empty frame arrives', async () => {
    mockFetch([JSON.stringify({ type: 'empty' }) + '\n'])

    const { result } = renderHook(() => useMoodStream())
    act(() => result.current.submit({ tags: ['Intense'], freeText: '' }))

    await waitFor(() => expect(result.current.status).toBe('empty'))
    expect(result.current.topPick).toBeNull()
  })

  it('preserves topPick and runners when error frame follows result frame', async () => {
    const candidate = makeCandidate({ title: 'Blade Runner 2049' })
    mockFetch([
      JSON.stringify({ type: 'result', topPick: candidate, runners: [] }) + '\n',
      JSON.stringify({ type: 'error', message: 'Explanation failed' }) + '\n',
    ])

    const { result } = renderHook(() => useMoodStream())
    act(() => result.current.submit({ tags: ['Intense'], freeText: '' }))

    await waitFor(() => expect(result.current.status).toBe('result'))
    expect(result.current.topPick?.title).toBe('Blade Runner 2049')
    expect(result.current.runners).toEqual([])
  })

  it('reassembles a token frame split across two chunks', async () => {
    const candidate = makeCandidate()
    const resultLine =
      JSON.stringify({ type: 'result', topPick: candidate, runners: [] }) + '\n'
    mockFetch([
      resultLine + '{"type":"tok',
      'en","text":"hi"}\n' + JSON.stringify({ type: 'done' }) + '\n',
    ])

    const { result } = renderHook(() => useMoodStream())
    act(() => result.current.submit({ tags: ['Cozy'], freeText: '' }))

    await waitFor(() => expect(result.current.status).toBe('result'))
    await waitFor(() => expect(result.current.explanation).toBe('hi'))
  })

  it('resets to idle state when reset() is called', async () => {
    const candidate = makeCandidate()
    mockFetch([
      JSON.stringify({ type: 'result', topPick: candidate, runners: [] }) + '\n',
      JSON.stringify({ type: 'done' }) + '\n',
    ])

    const { result } = renderHook(() => useMoodStream())
    act(() => result.current.submit({ tags: ['Cozy'], freeText: '' }))
    await waitFor(() => expect(result.current.status).toBe('result'))

    act(() => result.current.reset())

    expect(result.current.status).toBe('idle')
    expect(result.current.topPick).toBeNull()
    expect(result.current.explanation).toBe('')
  })
})
