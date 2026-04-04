import { useState, useCallback, useRef } from 'react'
import type { TmdbCandidate } from '../types/tmdb'
import { apiGet, apiPost, ApiError } from '../lib/api'

export type AddDiscState =
  | 'scan'
  | 'resolving'
  | 'confirm'
  | 'success'
  | 'camera_error'
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
  isLookingUp: boolean
  onBarcodeDetected: (barcode: string) => Promise<void>
  onBarcodeDetectorUnsupported: () => void
  onEnterManually: () => void
  onBarcodeSet: (barcode: string) => void
  onCandidateSelected: (candidate: TmdbCandidate) => void
  onCandidateRejected: () => void
  onFormatSelected: (format: DiscFormat) => void
  onConfirm: (forceAdd?: boolean) => Promise<void>
  onLookUp: () => Promise<void>
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
  const [format, setFormat] = useState<DiscFormat | null>('4K')
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TmdbCandidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
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
    setIsLookingUp(false)
  }, [])

  const onBarcodeDetectorUnsupported = () => {
    setState('camera_error')
  }

  const onEnterManually = () => {
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
      setErrorMessage('Search failed — check your connection and try again')
    } finally {
      setIsSearching(false)
    }
  }

  const onBarcodeDetected = async (scannedBarcode: string) => {
    barcodeRef.current = scannedBarcode
    setBarcode(scannedBarcode)
    setState('resolving')
    try {
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
    } catch {
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

  const onLookUp = async () => {
    const currentBarcode = barcodeRef.current
    if (!currentBarcode) return
    setIsLookingUp(true)
    try {
      const data = await apiGet<{ title: string | null }>(
        `/api/upc/${currentBarcode}`,
      )
      if (data.title) {
        const candidates = await apiGet<TmdbCandidate[]>(
          `/api/tmdb/search?q=${encodeURIComponent(data.title)}`,
        )
        setCandidate(candidates[0] ?? null)
      } else {
        setCandidate(null)
      }
    } catch {
      setCandidate(null)
    } finally {
      setIsLookingUp(false)
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
    isLookingUp,
    onBarcodeDetected,
    onBarcodeDetectorUnsupported,
    onEnterManually,
    onBarcodeSet,
    onCandidateSelected,
    onCandidateRejected,
    onFormatSelected,
    onConfirm,
    onLookUp,
    setSearchQuery: handleSetSearchQuery,
    search,
    reset,
    onClose,
  }
}
