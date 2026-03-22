import { describe, it, expect, vi, afterEach } from 'vitest'
import { lookupUpc } from '../lib/upcClient.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('upcClient', () => {
  it('returns a title string when UPCitemdb responds with a match', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [{ title: 'Blade Runner 2049' }] }),
      }),
    )

    const title = await lookupUpc('012569803638')

    expect(title).toBe('Blade Runner 2049')
  })

  it('returns null when UPCitemdb responds with no items', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      }),
    )

    const title = await lookupUpc('000000000000')

    expect(title).toBeNull()
  })

  it('returns null on network failure without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network error')),
    )

    const title = await lookupUpc('012569803638')

    expect(title).toBeNull()
  })
})
