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
  it('transitions to confirm state when BarcodeDetector is unsupported', () => {
    const { result } = renderHook(() => useAddDisc(onClose))

    expect(result.current.state).toBe('scan')

    act(() => {
      result.current.onBarcodeDetectorUnsupported()
    })

    expect(result.current.state).toBe('confirm')
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
