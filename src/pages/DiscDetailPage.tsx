import { useState, useContext } from 'react'
import { useParams } from 'react-router-dom'
import { useHistory } from 'react-router-dom'
import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react'
import { useDisc } from '../hooks/useDisc'
import type { DiscSummary } from '../types/disc'
import { CollectionRefreshContext } from '../context/CollectionRefreshContext'

const StarRating = ({
  rating,
  onRate,
}: {
  rating: DiscSummary['rating']
  onRate: (r: 1 | 2 | 3 | 4 | 5 | null) => void
}) => (
  <div style={{ display: 'flex', gap: '0.25rem', margin: '0.5rem 0' }}>
    {([1, 2, 3, 4, 5] as const).map((star) => (
      <button
        key={star}
        onClick={() => onRate(rating === star ? null : star)}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.75rem',
          cursor: 'pointer',
          color: rating !== null && star <= rating ? '#f4c430' : '#9e9e9e',
          padding: '0 0.1rem',
        }}
        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
      >
        ★
      </button>
    ))}
  </div>
)

const DiscDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const history = useHistory()
  const refreshRef = useContext(CollectionRefreshContext)

  const {
    disc,
    tmdbMovie,
    loading,
    toast,
    notesError,
    deleteError,
    localNotes,
    setLocalNotes,
    toggleWatched,
    setRating,
    saveNotes,
    deleteDisc,
  } = useDisc(
    id,
    () => history.replace('/'),
    () => refreshRef.current(),
  )

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>{disc?.title ?? ''}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '2rem',
            }}
          >
            <IonSpinner />
          </div>
        )}

        {!loading && disc && tmdbMovie && (
          <>
            {tmdbMovie.posterUrl && (
              <img
                src={tmdbMovie.posterUrl}
                alt={tmdbMovie.title}
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  marginBottom: '1rem',
                }}
              />
            )}

            <h1 style={{ margin: '0 0 0.25rem' }}>{tmdbMovie.title}</h1>
            <p style={{ margin: '0 0 0.5rem', opacity: 0.7 }}>
              {tmdbMovie.year} · {disc.format} · {tmdbMovie.runtime} min
            </p>
            <p style={{ margin: '0 0 0.5rem', opacity: 0.7 }}>
              TMDB rating: {tmdbMovie.tmdbRating.toFixed(1)}
            </p>

            {tmdbMovie.genres.length > 0 && (
              <p style={{ margin: '0 0 1rem', opacity: 0.7 }}>
                {tmdbMovie.genres.join(', ')}
              </p>
            )}

            <p style={{ margin: '0 0 1rem' }}>{tmdbMovie.overview}</p>

            {tmdbMovie.directors.length > 0 && (
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>
                  Director{tmdbMovie.directors.length > 1 ? 's' : ''}:
                </strong>{' '}
                {tmdbMovie.directors.join(', ')}
              </p>
            )}

            {tmdbMovie.cast.length > 0 && (
              <p style={{ margin: '0 0 1.5rem' }}>
                <strong>Cast:</strong> {tmdbMovie.cast.join(', ')}
              </p>
            )}

            {/* Watched toggle */}
            <IonButton
              expand="block"
              fill={disc.watched ? 'solid' : 'outline'}
              onClick={() => void toggleWatched()}
              style={{ marginBottom: '0.25rem' }}
            >
              {disc.watched ? '✓ Watched' : 'Mark as Watched'}
            </IonButton>
            {disc.watched && (
              <p
                style={{
                  margin: '0 0 1rem',
                  opacity: 0.6,
                  fontSize: '0.85rem',
                  textAlign: 'center',
                }}
              >
                Watched {disc.watchCount} time{disc.watchCount !== 1 ? 's' : ''}
              </p>
            )}

            {/* Star rating */}
            <StarRating
              rating={disc.rating}
              onRate={(r) => void setRating(r)}
            />

            {/* Notes */}
            <div style={{ marginTop: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.25rem',
                  opacity: 0.7,
                  fontSize: '0.85rem',
                }}
              >
                Notes
              </label>
              <textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={() => void saveNotes()}
                rows={3}
                placeholder="Add a note..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  color: 'inherit',
                  fontSize: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              {notesError && (
                <IonText color="danger">
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                    Failed — tap to retry{' '}
                    <button
                      onClick={() => void saveNotes()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 'inherit',
                      }}
                    >
                      Retry
                    </button>
                  </p>
                </IonText>
              )}
            </div>

            {/* Delete */}
            <div style={{ marginTop: '2rem' }}>
              <IonButton
                expand="block"
                color="danger"
                fill="outline"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Remove from Collection
              </IonButton>
              {deleteError && (
                <IonText color="danger">
                  <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                    {deleteError}
                  </p>
                </IonText>
              )}
            </div>
          </>
        )}
      </IonContent>

      <IonAlert
        isOpen={showDeleteConfirm}
        header="Remove from collection?"
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => setShowDeleteConfirm(false),
          },
          {
            text: 'Remove',
            role: 'destructive',
            handler: () => {
              setShowDeleteConfirm(false)
              void deleteDisc()
            },
          },
        ]}
        onDidDismiss={() => setShowDeleteConfirm(false)}
      />

      <IonToast isOpen={toast !== null} message={toast ?? ''} duration={1500} />
    </IonPage>
  )
}

export default DiscDetailPage
