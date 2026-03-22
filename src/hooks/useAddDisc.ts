import { useState, useCallback, useRef } from 'react'
import type { TmdbCandidate } from '../types/tmdb'

export type AddDiscState = 'scan' | 'confirm' | 'success' | 'error'
export type DiscFormat = '4K' | 'Blu-ray' | 'DVD'

export interface UseAddDiscResult {
  state: AddDiscState
  candidate: TmdbCandidate | null
  barcode: string
  format: DiscFormat | null
  isDuplicate: boolean
  errorMessage: string | null
  onBarcodeDetected: (barcode: string) => Promise<void>
  onBarcodeDetectorUnsupported: () => void
  onBarcodeSet: (barcode: string) => void
  onCandidateSelected: (candidate: TmdbCandidate) => void
  onCandidateRejected: () => void
  onFormatSelected: (format: DiscFormat) => void
  onConfirm: (forceAdd?: boolean) => Promise<void>
  searchTmdb: (query: string) => Promise<TmdbCandidate[]>
  reset: () => void
  onClose: () => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function useAddDisc(onClose: () => void): UseAddDiscResult {
  const [state, setState] = useState<AddDiscState>('scan')
  const [candidate, setCandidate] = useState<TmdbCandidate | null>(null)
  const [barcode, setBarcode] = useState('')
  const barcodeRef = useRef('')
  const [format, setFormat] = useState<DiscFormat | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const reset = useCallback(() => {
    setState('scan')
    setCandidate(null)
    barcodeRef.current = ''
    setBarcode('')
    setFormat(null)
    setIsDuplicate(false)
    setErrorMessage(null)
  }, [])

  const onBarcodeDetectorUnsupported = () => {
    setState('confirm')
  }

  const onBarcodeSet = (value: string) => {
    barcodeRef.current = value
    setBarcode(value)
  }

  const searchTmdb = async (query: string): Promise<TmdbCandidate[]> => {
    const res = await fetch(
      `${API_BASE}/api/tmdb/search?q=${encodeURIComponent(query)}`,
    )
    return (await res.json()) as TmdbCandidate[]
  }

  const onBarcodeDetected = async (scannedBarcode: string) => {
    barcodeRef.current = scannedBarcode
    setBarcode(scannedBarcode)
    const res = await fetch(`${API_BASE}/api/upc/${scannedBarcode}`)
    const data = (await res.json()) as { title: string | null }
    if (data.title) {
      const searchRes = await fetch(
        `${API_BASE}/api/tmdb/search?q=${encodeURIComponent(data.title)}`,
      )
      const candidates = (await searchRes.json()) as TmdbCandidate[]
      setCandidate(candidates[0] ?? null)
    } else {
      setCandidate(null)
    }
    setState('confirm')
  }

  const onCandidateSelected = (selected: TmdbCandidate) => {
    setCandidate(selected)
  }

  const onCandidateRejected = () => {
    setCandidate(null)
  }

  const onFormatSelected = (selected: DiscFormat) => {
    setFormat(selected)
  }

  const onConfirm = async (forceAdd = false) => {
    if (!candidate || !format) return
    setIsDuplicate(false)
    setErrorMessage(null)
    const res = await fetch(`${API_BASE}/api/discs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barcode: barcodeRef.current,
        format,
        tmdbId: candidate.tmdbId,
        forceAdd,
      }),
    })
    if (res.status === 409) {
      setIsDuplicate(true)
      return
    }
    if (!res.ok) {
      setErrorMessage('Failed to add disc. Please try again.')
      return
    }
    setState('success')
  }

  return {
    state,
    candidate,
    barcode,
    format,
    isDuplicate,
    errorMessage,
    onBarcodeDetected,
    onBarcodeDetectorUnsupported,
    onBarcodeSet,
    onCandidateSelected,
    onCandidateRejected,
    onFormatSelected,
    onConfirm,
    searchTmdb,
    reset,
    onClose,
  }
}
