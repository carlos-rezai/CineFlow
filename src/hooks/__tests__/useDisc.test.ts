// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDisc } from '../useDisc'

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeDisc = () => ({
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
})

const makeTmdbMovie = () => ({
  tmdbId: 335984,
  title: 'Blade Runner 2049',
  year: 2017,
  posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
  overview: 'A blade runner discovers a secret.',
  runtime: 164,
  genres: ['Science Fiction'],
  directors: ['Denis Villeneuve'],
  cast: ['Ryan Gosling', 'Harrison Ford'],
  tmdbRating: 7.9,
  cachedAt: '2026-03-01T00:00:00.000Z',
})

const okFetch = (body: unknown) =>
  Promise.resolve({ ok: true, json: async () => body })

const failFetch = () => Promise.resolve({ ok: false, json: async () => ({}) })

describe('useDisc', () => {
  it('returns disc and tmdbMovie fetched from GET /api/discs/:id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ disc: makeDisc(), tmdbMovie: makeTmdbMovie() }),
      }),
    )

    const { result } = renderHook(() => useDisc('disc1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.disc?.title).toBe('Blade Runner 2049')
    expect(result.current.tmdbMovie?.directors).toContain('Denis Villeneuve')
    expect(result.current.tmdbMovie?.runtime).toBe(164)
  })

  it('toggleWatched when unwatched sets watched=true, increments watchCount, and sets lastWatchedAt immediately', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: makeDisc(), tmdbMovie: makeTmdbMovie() }),
        )
        .mockResolvedValueOnce(okFetch({})),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.toggleWatched()
    })

    expect(result.current.disc?.watched).toBe(true)
    expect(result.current.disc?.watchCount).toBe(1)
    expect(result.current.disc?.lastWatchedAt).not.toBeNull()
  })

  it('toggleWatched when watched sets watched=false and preserves watchCount and lastWatchedAt', async () => {
    const watchedDisc = {
      ...makeDisc(),
      watched: true,
      watchCount: 3,
      lastWatchedAt: '2026-03-10T12:00:00.000Z',
    }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: watchedDisc, tmdbMovie: makeTmdbMovie() }),
        )
        .mockResolvedValueOnce(okFetch({})),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.toggleWatched()
    })

    expect(result.current.disc?.watched).toBe(false)
    expect(result.current.disc?.watchCount).toBe(3)
    expect(result.current.disc?.lastWatchedAt).toBe('2026-03-10T12:00:00.000Z')
  })

  it('toggleWatched reverts disc and sets toast when PATCH fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: makeDisc(), tmdbMovie: makeTmdbMovie() }),
        )
        .mockResolvedValueOnce(failFetch()),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.toggleWatched()
    })

    expect(result.current.disc?.watched).toBe(false)
    expect(result.current.disc?.watchCount).toBe(0)
    expect(result.current.toast).toBe('Failed to save — changes reverted')
  })

  it('setRating updates disc.rating immediately', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: makeDisc(), tmdbMovie: makeTmdbMovie() }),
        )
        .mockResolvedValueOnce(okFetch({})),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setRating(4)
    })

    expect(result.current.disc?.rating).toBe(4)
  })

  it('setRating(null) clears disc.rating immediately', async () => {
    const ratedDisc = { ...makeDisc(), rating: 5 as const }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: ratedDisc, tmdbMovie: makeTmdbMovie() }),
        )
        .mockResolvedValueOnce(okFetch({})),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setRating(null)
    })

    expect(result.current.disc?.rating).toBeNull()
  })

  it('setRating reverts disc.rating and sets toast when PATCH fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: makeDisc(), tmdbMovie: makeTmdbMovie() }),
        )
        .mockResolvedValueOnce(failFetch()),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setRating(3)
    })

    expect(result.current.disc?.rating).toBeNull()
    expect(result.current.toast).toBe('Failed to save — changes reverted')
  })

  it('saveNotes fires PATCH and sets toast to "Saved" on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: makeDisc(), tmdbMovie: makeTmdbMovie() }),
        )
        .mockResolvedValueOnce(okFetch({})),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setLocalNotes('Great steelbook edition')
    })

    await act(async () => {
      await result.current.saveNotes()
    })

    expect(result.current.toast).toBe('Saved')
    expect(result.current.disc?.notes).toBe('Great steelbook edition')
  })

  it('saveNotes sets notesError when PATCH fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: makeDisc(), tmdbMovie: makeTmdbMovie() }),
        )
        .mockResolvedValueOnce(failFetch()),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setLocalNotes('Some note')
    })

    await act(async () => {
      await result.current.saveNotes()
    })

    expect(result.current.notesError).toBe(true)
    expect(result.current.toast).toBeNull()
  })

  it('localNotes is populated from disc.notes after initial fetch resolves', async () => {
    const discWithNotes = { ...makeDisc(), notes: 'Steelbook edition' }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: discWithNotes, tmdbMovie: makeTmdbMovie() }),
        ),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.localNotes).toBe('Steelbook edition')
  })

  it('setLocalNotes updates localNotes in the hook', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: makeDisc(), tmdbMovie: makeTmdbMovie() }),
        ),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setLocalNotes('Updated note')
    })

    expect(result.current.localNotes).toBe('Updated note')
  })

  it('deleteDisc calls DELETE and invokes onDelete callback on success', async () => {
    const onDelete = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: makeDisc(), tmdbMovie: makeTmdbMovie() }),
        )
        .mockResolvedValueOnce(
          Promise.resolve({ ok: true, json: async () => ({}) }),
        ),
    )

    const { result } = renderHook(() => useDisc('disc1', onDelete))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteDisc()
    })

    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('deleteDisc sets deleteError when DELETE fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          okFetch({ disc: makeDisc(), tmdbMovie: makeTmdbMovie() }),
        )
        .mockResolvedValueOnce(failFetch()),
    )

    const { result } = renderHook(() => useDisc('disc1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteDisc()
    })

    expect(result.current.deleteError).not.toBeNull()
  })
})
