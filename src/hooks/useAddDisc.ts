import { useState } from 'react'
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
  onCandidateSelected: (candidate: TmdbCandidate) => void
  onCandidateRejected: () => void
  onFormatSelected: (format: DiscFormat) => void
  onConfirm: (forceAdd?: boolean) => Promise<void>
  onClose: () => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function useAddDisc(onClose: () => void): UseAddDiscResult {
  const [state, setState] = useState<AddDiscState>('scan')
  const [candidate, setCandidate] = useState<TmdbCandidate | null>(null)
  const [barcode, setBarcode] = useState('')
  const [format, setFormat] = useState<DiscFormat | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onBarcodeDetectorUnsupported = () => {
    setState('confirm')
  }

  const onBarcodeDetected = async (scannedBarcode: string) => {
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
        barcode,
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
    onCandidateSelected,
    onCandidateRejected,
    onFormatSelected,
    onConfirm,
    onClose,
  }
}
