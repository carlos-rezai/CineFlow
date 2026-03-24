// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCollection } from '../useCollection'

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeDisc = (overrides: Record<string, unknown> = {}) => ({
  _id: 'disc1',
  barcode: '012569803638',
  tmdbId: 335984,
  format: '4K',
  addedAt: '2026-03-01T00:00:00.000Z',
  watched: false,
  watchCount: 0,
  lastWatchedAt: null,
  rating: null,
  notes: null,
  posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
  title: 'Blade Runner 2049',
  ...overrides,
})

describe('useCollection', () => {
  it('returns discs fetched from GET /api/discs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [makeDisc()],
      }),
    )

    const { result } = renderHook(() => useCollection())

    await waitFor(() => expect(result.current.discs).toHaveLength(1))

    expect(result.current.discs[0].title).toBe('Blade Runner 2049')
    expect(result.current.discs[0].barcode).toBe('012569803638')
  })

  it('fetches only unwatched discs when filter is set to unwatched', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [makeDisc({ watched: false, title: 'Dune' })],
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCollection())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // change filter to unwatched
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [makeDisc({ watched: false, title: 'Dune' })],
    })
    result.current.setFilter('unwatched')

    await waitFor(() => {
      const url: string = (fetchMock.mock.calls.at(-1) as [string])[0]
      expect(url).toContain('watched=false')
    })
  })

  it('fetches only watched discs when filter is set to watched', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [makeDisc({ watched: true })],
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCollection())
    await waitFor(() => expect(result.current.loading).toBe(false))

    result.current.setFilter('watched')

    await waitFor(() => {
      const url: string = (fetchMock.mock.calls.at(-1) as [string])[0]
      expect(url).toContain('watched=true')
    })
  })

  it('exposes refreshToken in its return value', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
    )

    const { result } = renderHook(() => useCollection())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(typeof result.current.refreshToken).toBe('number')
  })

  it('increments refreshToken each time refresh() is called', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
    )

    const { result } = renderHook(() => useCollection())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const tokenBefore = result.current.refreshToken
    result.current.refresh()

    await waitFor(() =>
      expect(result.current.refreshToken).toBe(tokenBefore + 1),
    )
  })
})
