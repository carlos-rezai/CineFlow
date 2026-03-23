import { useState, useCallback, useRef } from 'react'
import type { TmdbCandidate } from '../types/tmdb'
import { apiGet, apiPost, ApiError } from '../lib/api'

export type AddDiscState = 'scan' | 'confirm' | 'success' | 'error'
export type DiscFormat = '4K' | 'Blu-ray' | 'DVD'

export interface UseAddDiscResult {
  state: AddDiscState
  candidate: TmdbCandidate | null
  barcode: string
  format: DiscFormat | null
  isDuplicate: boolean
  errorMessage: string | null
  searchQuery: string
  searchResults: TmdbCandidate[]
  isSearching: boolean
  onBarcodeDetected: (barcode: string) => Promise<void>
  onBarcodeDetectorUnsupported: () => void
  onBarcodeSet: (barcode: string) => void
  onCandidateSelected: (candidate: TmdbCandidate) => void
  onCandidateRejected: () => void
  onFormatSelected: (format: DiscFormat) => void
  onConfirm: (forceAdd?: boolean) => Promise<void>
  setSearchQuery: (query: string) => void
  search: () => Promise<void>
  reset: () => void
  onClose: () => void
}

export function useAddDisc(onClose: () => void): UseAddDiscResult {
  const [state, setState] = useState<AddDiscState>('scan')
  const [candidate, setCandidate] = useState<TmdbCandidate | null>(null)
  const [barcode, setBarcode] = useState('')
  const barcodeRef = useRef('')
  const [format, setFormat] = useState<DiscFormat | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TmdbCandidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchQueryRef = useRef('')

  const handleSetSearchQuery = (query: string) => {
    searchQueryRef.current = query
    setSearchQuery(query)
  }

  const reset = useCallback(() => {
    setState('scan')
    setCandidate(null)
    barcodeRef.current = ''
    setBarcode('')
    setFormat(null)
    setIsDuplicate(false)
    setErrorMessage(null)
    searchQueryRef.current = ''
    setSearchQuery('')
    setSearchResults([])
    setIsSearching(false)
  }, [])

  const onBarcodeDetectorUnsupported = () => {
    setState('confirm')
  }

  const onBarcodeSet = (value: string) => {
    barcodeRef.current = value
    setBarcode(value)
  }

  const search = async () => {
    const query = searchQueryRef.current
    if (!query.trim()) return
    setIsSearching(true)
    try {
      const results = await apiGet<TmdbCandidate[]>(
        `/api/tmdb/search?q=${encodeURIComponent(query)}`,
      )
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const onBarcodeDetected = async (scannedBarcode: string) => {
    barcodeRef.current = scannedBarcode
    setBarcode(scannedBarcode)
    const data = await apiGet<{ title: string | null }>(
      `/api/upc/${scannedBarcode}`,
    )
    if (data.title) {
      const candidates = await apiGet<TmdbCandidate[]>(
        `/api/tmdb/search?q=${encodeURIComponent(data.title)}`,
      )
      setCandidate(candidates[0] ?? null)
    } else {
      setCandidate(null)
    }
    setState('confirm')
  }

  const onCandidateSelected = (selected: TmdbCandidate) => {
    setCandidate(selected)
    setSearchResults([])
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
    try {
      await apiPost('/api/discs', {
        barcode: barcodeRef.current,
        format,
        tmdbId: candidate.tmdbId,
        forceAdd,
      })
      setState('success')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setIsDuplicate(true)
      } else {
        setErrorMessage('Failed to add disc. Please try again.')
      }
    }
  }

  return {
    state,
    candidate,
    barcode,
    format,
    isDuplicate,
    errorMessage,
    searchQuery,
    searchResults,
    isSearching,
    onBarcodeDetected,
    onBarcodeDetectorUnsupported,
    onBarcodeSet,
    onCandidateSelected,
    onCandidateRejected,
    onFormatSelected,
    onConfirm,
    setSearchQuery: handleSetSearchQuery,
    search,
    reset,
    onClose,
  }
}
