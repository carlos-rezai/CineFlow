// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
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
})
