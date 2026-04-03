import { useEffect, useRef, useCallback } from 'react'
import { IonContent, IonModal, IonSpinner, IonText } from '@ionic/react'
import { useAddDisc } from '../hooks/useAddDisc'
import type { DiscFormat } from '../hooks/useAddDisc'
import './AddDiscModal.css'

interface BarcodeDetected {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<BarcodeDetected[]>
}
interface WindowWithBarcodeDetector {
  BarcodeDetector: new (options: { formats: string[] }) => BarcodeDetectorLike
}

interface AddDiscModalProps {
  isOpen: boolean
  onDidDismiss: () => void
}

const FORMAT_OPTIONS: { value: DiscFormat; label: string }[] = [
  { value: '4K', label: '4K ULTRA HD' },
  { value: 'Blu-ray', label: 'BLU-RAY' },
  { value: 'DVD', label: 'DVD' },
]

const AddDiscModal = ({ isOpen, onDidDismiss }: AddDiscModalProps) => {
  const onDidDismissRef = useRef(onDidDismiss)
  onDidDismissRef.current = onDidDismiss

  const stableOnDidDismiss = useCallback(() => onDidDismissRef.current(), [])

  const {
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
    setSearchQuery,
    search,
    reset,
  } = useAddDisc(stableOnDidDismiss)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!isOpen) return
    reset()
  }, [isOpen, reset])

  useEffect(() => {
    if (state !== 'success') return
    const timer = setTimeout(() => onDidDismissRef.current(), 1500)
    return () => clearTimeout(timer)
  }, [state])

  useEffect(() => {
    if (state !== 'scan' || !isOpen) return

    if (!('BarcodeDetector' in window)) {
      onBarcodeDetectorUnsupported()
      return
    }

    let stopped = false
    let animFrameId: number

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    const startScan = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const win = window as unknown as WindowWithBarcodeDetector
        const detector = new win.BarcodeDetector({
          formats: ['ean_13', 'upc_a', 'upc_e'],
        })

        const scan = async () => {
          if (stopped || !videoRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              stopped = true
              stopStream()
              await onBarcodeDetected(barcodes[0].rawValue)
              return
            }
          } catch {
            // continue scanning
          }
          animFrameId = requestAnimationFrame(() => void scan())
        }

        void scan()
      } catch {
        onBarcodeDetectorUnsupported()
      }
    }

    void startScan()

    return () => {
      stopped = true
      cancelAnimationFrame(animFrameId)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [state, isOpen, onBarcodeDetected, onBarcodeDetectorUnsupported])

  if (state === 'scan') {
    return (
      <IonModal isOpen={isOpen} onDidDismiss={stableOnDidDismiss}>
        <div className="add-disc__scan-header">
          <p className="text-section">Scan Barcode</p>
          <button className="add-disc__close-btn" onClick={stableOnDidDismiss}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <IonContent>
          <video ref={videoRef} className="add-disc__video" playsInline muted />
        </IonContent>
      </IonModal>
    )
  }

  if (state === 'success') {
    return (
      <IonModal isOpen={isOpen} onDidDismiss={stableOnDidDismiss}>
        <IonContent>
          <div className="add-disc__success">
            <span className="material-symbols-rounded add-disc__success-icon">
              check_circle
            </span>
            <p className="text-sub">Disc added!</p>
          </div>
        </IonContent>
      </IonModal>
    )
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={stableOnDidDismiss}>
      {/* Hero header */}
      <div className="add-disc__hero">
        <p className="text-section add-disc__hero-eyebrow">
          Inventory Management
        </p>
        <h2 className="text-hero add-disc__hero-title">ADD NEW DISC</h2>
      </div>

      <IonContent>
        <div className="add-disc__form">
          {/* Barcode */}
          <p className="text-section add-disc__section-label">
            Scan or Enter Barcode
          </p>
          <div className="add-disc__input-wrap">
            <input
              type="text"
              value={barcode}
              onChange={(e) => onBarcodeSet(e.target.value)}
              placeholder="Enter barcode"
              className="add-disc__input"
            />
            <span className="material-symbols-rounded add-disc__input-icon">
              barcode_scanner
            </span>
          </div>

          {/* Divider */}
          <div className="add-disc__divider" />

          {/* Film search / candidate */}
          {candidate ? (
            <>
              {candidate.posterUrl && (
                <img
                  src={candidate.posterUrl}
                  alt={candidate.title}
                  className="add-disc__candidate-poster"
                />
              )}
              <p className="add-disc__candidate-title text-sub">
                {candidate.title}
              </p>
              <p className="add-disc__candidate-year text-meta">
                {candidate.year}
              </p>
              <button
                className="add-disc__reject-btn"
                onClick={onCandidateRejected}
              >
                Not the right film? Search instead
              </button>
            </>
          ) : (
            <>
              <p className="text-section add-disc__section-label">Film Title</p>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter title"
                className="add-disc__input"
              />
              <button
                className="add-disc__search-btn"
                onClick={() => void search()}
                disabled={isSearching}
              >
                {isSearching ? (
                  <IonSpinner />
                ) : (
                  <>
                    <span className="material-symbols-rounded">search</span>
                    SEARCH DATABASE
                  </>
                )}
              </button>
              {searchResults.map((r) => (
                <div
                  key={r.tmdbId}
                  className="add-disc__search-result"
                  onClick={() => onCandidateSelected(r)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onCandidateSelected(r)}
                >
                  {r.posterUrl && (
                    <img
                      src={r.posterUrl}
                      alt={r.title}
                      className="add-disc__search-result-poster"
                    />
                  )}
                  <div>
                    <p className="text-sub add-disc__result-title">{r.title}</p>
                    <p className="text-meta">{r.year}</p>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Media format */}
          <p className="text-section add-disc__section-label">Media Format</p>
          <div className="add-disc__format-group">
            {FORMAT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                className={`add-disc__format-btn${format === value ? ' add-disc__format-btn--active' : ''}`}
                onClick={() => onFormatSelected(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {isDuplicate && (
            <IonText color="warning">
              <p className="add-disc__warning">
                You already own this disc — add anyway?
              </p>
            </IonText>
          )}

          {errorMessage && <p className="add-disc__error">{errorMessage}</p>}

          {/* Actions */}
          {isDuplicate ? (
            <>
              <button
                className="add-disc__confirm-btn"
                onClick={() => void onConfirm(true)}
              >
                Add anyway →
              </button>
              <button
                className="add-disc__cancel-btn"
                onClick={stableOnDidDismiss}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="add-disc__confirm-btn"
              onClick={() => void onConfirm()}
              disabled={!candidate || !format}
            >
              ADD TO COLLECTION →
            </button>
          )}
        </div>
      </IonContent>
    </IonModal>
  )
}

export default AddDiscModal
