import { describe, it, expect, vi, afterEach } from 'vitest'
import { searchTmdb } from '../lib/tmdbClient.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tmdbClient', () => {
  it('returns TmdbCandidates shaped as { tmdbId, title, year, posterUrl }', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 335984,
              title: 'Blade Runner 2049',
              release_date: '2017-10-06',
              poster_path: '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
              overview: 'A blade runner discovers a secret.',
              vote_average: 7.9,
              runtime: null,
              genre_ids: [878, 18],
            },
          ],
        }),
      }),
    )

    const candidates = await searchTmdb('blade runner 2049')

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toEqual({
      tmdbId: 335984,
      title: 'Blade Runner 2049',
      year: 2017,
      posterUrl:
        'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    })
  })

  it('returns an empty array when TMDB returns no results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      }),
    )

    const candidates = await searchTmdb('xyzzy no such film')

    expect(candidates).toEqual([])
  })
})
