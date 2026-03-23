import { useEffect, useRef, useCallback } from 'react'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useAddDisc } from '../hooks/useAddDisc'
import type { DiscFormat } from '../hooks/useAddDisc'

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

const AddDiscModal = ({ isOpen, onDidDismiss }: AddDiscModalProps) => {
  // Stable ref — keeps latest callback without triggering effect re-runs
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

  // Reset all state whenever the modal opens
  useEffect(() => {
    if (!isOpen) return
    reset()
  }, [isOpen, reset])

  // Auto-close after success
  useEffect(() => {
    if (state !== 'success') return
    const timer = setTimeout(() => onDidDismissRef.current(), 1500)
    return () => clearTimeout(timer)
  }, [state])

  // Start camera scanning when modal opens in scan state
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
        <IonHeader>
          <IonToolbar>
            <IonTitle>Scan Barcode</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={stableOnDidDismiss}>Cancel</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <video ref={videoRef} style={{ width: '100%' }} playsInline muted />
        </IonContent>
      </IonModal>
    )
  }

  if (state === 'success') {
    return (
      <IonModal isOpen={isOpen} onDidDismiss={stableOnDidDismiss}>
        <IonContent className="ion-text-center ion-padding">
          <IonText>
            <h2>Disc added!</h2>
          </IonText>
        </IonContent>
      </IonModal>
    )
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={stableOnDidDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Add Disc</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={stableOnDidDismiss}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Barcode</IonLabel>
          <input
            type="text"
            value={barcode}
            onChange={(e) => onBarcodeSet(e.target.value)}
            placeholder="Enter barcode manually"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '8px 0',
              color: 'inherit',
              fontSize: 'inherit',
            }}
          />
        </IonItem>

        {candidate ? (
          <>
            {candidate.posterUrl && (
              <img
                src={candidate.posterUrl}
                alt={candidate.title}
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain',
                }}
              />
            )}
            <IonItem>
              <IonLabel>
                <h2>{candidate.title}</h2>
                <p>{candidate.year}</p>
              </IonLabel>
            </IonItem>
            <IonButton fill="clear" onClick={onCandidateRejected}>
              Not the right film? Search instead
            </IonButton>
          </>
        ) : (
          <>
            <IonItem>
              <IonLabel position="stacked">Search for film</IonLabel>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter title"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '8px 0',
                  color: 'inherit',
                  fontSize: 'inherit',
                }}
              />
            </IonItem>
            <IonButton
              expand="block"
              onClick={() => void search()}
              disabled={isSearching}
            >
              {isSearching ? <IonSpinner /> : 'Search'}
            </IonButton>
            {searchResults.map((r) => (
              <IonItem
                key={r.tmdbId}
                button
                onClick={() => onCandidateSelected(r)}
              >
                {r.posterUrl && (
                  <img
                    src={r.posterUrl}
                    alt={r.title}
                    slot="start"
                    style={{ height: '60px', width: 'auto' }}
                  />
                )}
                <IonLabel>
                  <h3>{r.title}</h3>
                  <p>{r.year}</p>
                </IonLabel>
              </IonItem>
            ))}
          </>
        )}

        <IonItem>
          <IonLabel>Format</IonLabel>
          <IonSelect
            value={format}
            onIonChange={(e) => onFormatSelected(e.detail.value as DiscFormat)}
            placeholder="Select format"
          >
            <IonSelectOption value="4K">4K</IonSelectOption>
            <IonSelectOption value="Blu-ray">Blu-ray</IonSelectOption>
            <IonSelectOption value="DVD">DVD</IonSelectOption>
          </IonSelect>
        </IonItem>

        {isDuplicate && (
          <IonText color="warning">
            <p>You already own this disc — add anyway?</p>
          </IonText>
        )}

        {errorMessage && (
          <IonText color="danger">
            <p>{errorMessage}</p>
          </IonText>
        )}

        {isDuplicate ? (
          <>
            <IonButton
              expand="block"
              color="warning"
              onClick={() => void onConfirm(true)}
            >
              Add anyway
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={stableOnDidDismiss}>
              Cancel
            </IonButton>
          </>
        ) : (
          <IonButton
            expand="block"
            onClick={() => void onConfirm()}
            disabled={!candidate || !format}
          >
            Add to Collection
          </IonButton>
        )}
      </IonContent>
    </IonModal>
  )
}

export default AddDiscModal
