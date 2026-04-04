// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAddDisc } from '../useAddDisc'

afterEach(() => {
  vi.unstubAllGlobals()
})

const onClose = vi.fn()

const makeCandidate = () => ({
  tmdbId: 335984,
  title: 'Blade Runner 2049',
  year: 2017,
  posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
})

describe('useAddDisc', () => {
  it('transitions to camera_error state when BarcodeDetector is unsupported', () => {
    const { result } = renderHook(() => useAddDisc(onClose))

    expect(result.current.state).toBe('scan')

    act(() => {
      result.current.onBarcodeDetectorUnsupported()
    })

    expect(result.current.state).toBe('camera_error')
  })

  it('transitions from camera_error to confirm when user chooses to enter manually', () => {
    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.onBarcodeDetectorUnsupported()
    })

    expect(result.current.state).toBe('camera_error')

    act(() => {
      result.current.onEnterManually()
    })

    expect(result.current.state).toBe('confirm')
  })

  it('transitions to resolving state while UPC lookup is in-flight', async () => {
    let resolveUpc!: (value: unknown) => void
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUpc = resolve
        }),
      ),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      void result.current.onBarcodeDetected('012569803638')
    })

    expect(result.current.state).toBe('resolving')

    await act(async () => {
      resolveUpc({ ok: true, json: async () => ({ title: null }) })
    })
  })

  it('advances to confirm with no candidate when UPC lookup throws a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('Network error')),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    await act(async () => {
      await result.current.onBarcodeDetected('012569803638')
    })

    expect(result.current.state).toBe('confirm')
    expect(result.current.candidate).toBeNull()
  })

  it('fires UPC lookup on barcode detected, pre-populates candidate, advances to confirm', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ title: 'Blade Runner 2049' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [makeCandidate()],
        }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    await act(async () => {
      await result.current.onBarcodeDetected('012569803638')
    })

    expect(result.current.state).toBe('confirm')
    expect(result.current.barcode).toBe('012569803638')
    expect(result.current.candidate?.tmdbId).toBe(335984)
    expect(result.current.candidate?.title).toBe('Blade Runner 2049')
  })

  it('advances to confirm with no candidate when UPC lookup returns null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: null }),
      }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    await act(async () => {
      await result.current.onBarcodeDetected('000000000000')
    })

    expect(result.current.state).toBe('confirm')
    expect(result.current.candidate).toBeNull()
  })

  it('calls POST /api/discs and transitions to success on confirm', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.onBarcodeDetectorUnsupported()
    })
    act(() => {
      result.current.onEnterManually()
      result.current.onCandidateSelected(makeCandidate())
      result.current.onFormatSelected('4K')
    })

    await act(async () => {
      await result.current.onConfirm()
    })

    expect(result.current.state).toBe('success')
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/discs')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body as string) as Record<string, unknown>
    expect(body.tmdbId).toBe(335984)
    expect(body.format).toBe('4K')
  })

  it('surfaces isDuplicate and stays in confirm when POST returns 409', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'duplicate', discId: 'existing1' }),
      }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.onBarcodeDetectorUnsupported()
    })
    act(() => {
      result.current.onEnterManually()
      result.current.onCandidateSelected(makeCandidate())
      result.current.onFormatSelected('4K')
    })

    await act(async () => {
      await result.current.onConfirm()
    })

    expect(result.current.state).toBe('confirm')
    expect(result.current.isDuplicate).toBe(true)
  })

  it('sends forceAdd in request body and transitions to success when user proceeds past duplicate warning', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.onBarcodeDetectorUnsupported()
    })
    act(() => {
      result.current.onEnterManually()
      result.current.onCandidateSelected(makeCandidate())
      result.current.onFormatSelected('Blu-ray')
    })

    await act(async () => {
      await result.current.onConfirm(true)
    })

    expect(result.current.state).toBe('success')
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(options.body as string) as Record<string, unknown>
    expect(body.forceAdd).toBe(true)
  })

  it('sets errorMessage and stays in confirm when POST fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.onBarcodeDetectorUnsupported()
    })
    act(() => {
      result.current.onEnterManually()
      result.current.onCandidateSelected(makeCandidate())
      result.current.onFormatSelected('4K')
    })

    await act(async () => {
      await result.current.onConfirm()
    })

    expect(result.current.state).toBe('confirm')
    expect(result.current.errorMessage).not.toBeNull()
  })
})

describe('format default', () => {
  it('format is 4K on initial render', () => {
    const { result } = renderHook(() => useAddDisc(onClose))

    expect(result.current.format).toBe('4K')
  })
})

describe('search state', () => {
  it('setSearchQuery updates searchQuery', () => {
    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.setSearchQuery('Blade Runner')
    })

    expect(result.current.searchQuery).toBe('Blade Runner')
  })

  it('search() with non-empty query fetches TMDB and populates searchResults', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [makeCandidate()],
      }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.setSearchQuery('Blade Runner')
    })

    await act(async () => {
      await result.current.search()
    })

    expect(result.current.searchResults).toHaveLength(1)
    expect(result.current.searchResults[0].tmdbId).toBe(335984)
  })

  it('search() with empty query does not fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAddDisc(onClose))

    await act(async () => {
      await result.current.search()
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('failed TMDB search sets errorMessage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.setSearchQuery('Blade Runner')
    })

    await act(async () => {
      await result.current.search()
    })

    expect(result.current.errorMessage).not.toBeNull()
  })

  it('reset() clears errorMessage set by a failed search', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.setSearchQuery('Blade Runner')
    })

    await act(async () => {
      await result.current.search()
    })

    expect(result.current.errorMessage).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.errorMessage).toBeNull()
  })

  it('failed TMDB search leaves searchResults empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.setSearchQuery('Blade Runner')
    })

    await act(async () => {
      await result.current.search()
    })

    expect(result.current.searchResults).toHaveLength(0)
  })

  it('reset() clears searchResults and searchQuery', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [makeCandidate()],
      }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.setSearchQuery('Blade Runner')
    })

    await act(async () => {
      await result.current.search()
    })

    expect(result.current.searchResults).toHaveLength(1)

    act(() => {
      result.current.reset()
    })

    expect(result.current.searchQuery).toBe('')
    expect(result.current.searchResults).toHaveLength(0)
  })
})

describe('onLookUp', () => {
  it('populates candidate when UPC lookup returns a title and TMDB search returns results', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ title: 'Blade Runner 2049' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [makeCandidate()],
        }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.onBarcodeDetectorUnsupported()
      result.current.onEnterManually()
      result.current.onBarcodeSet('012569803638')
    })

    await act(async () => {
      await result.current.onLookUp()
    })

    expect(result.current.candidate?.tmdbId).toBe(335984)
    expect(result.current.isLookingUp).toBe(false)
    expect(result.current.state).toBe('confirm')
  })

  it('leaves candidate null and clears isLookingUp when UPC returns no title', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: null }),
      }),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.onBarcodeDetectorUnsupported()
      result.current.onEnterManually()
      result.current.onBarcodeSet('000000000000')
    })

    await act(async () => {
      await result.current.onLookUp()
    })

    expect(result.current.candidate).toBeNull()
    expect(result.current.isLookingUp).toBe(false)
    expect(result.current.state).toBe('confirm')
  })

  it('leaves candidate null and clears isLookingUp on network failure, does not throw', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('Network error')),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.onBarcodeDetectorUnsupported()
      result.current.onEnterManually()
      result.current.onBarcodeSet('012569803638')
    })

    await act(async () => {
      await result.current.onLookUp()
    })

    expect(result.current.candidate).toBeNull()
    expect(result.current.isLookingUp).toBe(false)
    expect(result.current.state).toBe('confirm')
  })

  it('isLookingUp is true while lookup is in-flight and false after', async () => {
    let resolveUpc!: (value: unknown) => void
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUpc = resolve
        }),
      ),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.onBarcodeSet('012569803638')
    })

    act(() => {
      void result.current.onLookUp()
    })

    expect(result.current.isLookingUp).toBe(true)

    await act(async () => {
      resolveUpc({ ok: true, json: async () => ({ title: null }) })
    })

    expect(result.current.isLookingUp).toBe(false)
  })

  it('reset() clears isLookingUp', async () => {
    let resolveUpc!: (value: unknown) => void
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUpc = resolve
        }),
      ),
    )

    const { result } = renderHook(() => useAddDisc(onClose))

    act(() => {
      result.current.onBarcodeSet('012569803638')
    })

    act(() => {
      void result.current.onLookUp()
    })

    expect(result.current.isLookingUp).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.isLookingUp).toBe(false)

    // resolve the dangling promise to avoid unhandled rejection
    await act(async () => {
      resolveUpc({ ok: true, json: async () => ({ title: null }) })
    })
  })
})
