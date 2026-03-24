// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useStats } from '../useStats'
import type { CollectionStats } from '../../types/stats'

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeStats = (
  overrides: Partial<CollectionStats> = {},
): CollectionStats => ({
  totalDiscs: 5,
  watchedCount: 2,
  unwatchedCount: 3,
  watchedPercent: 40.0,
  totalWatchCount: 3,
  totalRuntimeMinutes: 750,
  unwatchedRuntimeMinutes: 435,
  averageRating: 4.0,
  formatBreakdown: { '4K': 3, 'Blu-ray': 1, DVD: 1 },
  genres: [{ genre: 'Science Fiction', count: 3 }],
  directors: [
    {
      name: 'Denis Villeneuve',
      discCount: 2,
      watchedCount: 1,
      titles: ['Dune', 'Arrival'],
    },
  ],
  ...overrides,
})

describe('useStats', () => {
  it('returns CollectionStats on a successful fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => makeStats() }),
    )

    const { result } = renderHook(() => useStats(0))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).not.toBeNull()
    expect(result.current.stats!.totalDiscs).toBe(5)
    expect(result.current.stats!.watchedCount).toBe(2)
    expect(result.current.stats!.genres[0].genre).toBe('Science Fiction')
  })

  it('stats is null while loading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
    )

    const { result } = renderHook(() => useStats(0))

    expect(result.current.loading).toBe(true)
    expect(result.current.stats).toBeNull()
  })

  it('stats is null on fetch failure (silent degradation)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    )

    const { result } = renderHook(() => useStats(0))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toBeNull()
  })

  it('re-fetches when refreshToken changes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeStats(),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(
      ({ token }: { token: number }) => useStats(token),
      { initialProps: { token: 0 } },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    const callsBefore = fetchMock.mock.calls.length

    act(() => {
      rerender({ token: 1 })
    })

    await waitFor(() =>
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore),
    )
  })
})
