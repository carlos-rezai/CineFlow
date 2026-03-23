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
import './DiscDetailPage.css'

const StarRating = ({
  rating,
  onRate,
}: {
  rating: DiscSummary['rating']
  onRate: (r: 1 | 2 | 3 | 4 | 5 | null) => void
}) => (
  <div className="star-rating">
    {([1, 2, 3, 4, 5] as const).map((star) => (
      <button
        key={star}
        onClick={() => onRate(rating === star ? null : star)}
        className="star-rating__button"
        style={{
          color: rating !== null && star <= rating ? '#f4c430' : '#9e9e9e',
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
          <div className="disc-detail__spinner">
            <IonSpinner />
          </div>
        )}

        {!loading && disc && tmdbMovie && (
          <>
            {tmdbMovie.posterUrl && (
              <img
                src={tmdbMovie.posterUrl}
                alt={tmdbMovie.title}
                className="disc-detail__poster"
              />
            )}

            <h1 className="disc-detail__title">{tmdbMovie.title}</h1>
            <p className="disc-detail__meta">
              {tmdbMovie.year} · {disc.format} · {tmdbMovie.runtime} min
            </p>
            <p className="disc-detail__meta">
              TMDB rating: {tmdbMovie.tmdbRating.toFixed(1)}
            </p>

            {tmdbMovie.genres.length > 0 && (
              <p className="disc-detail__genres">
                {tmdbMovie.genres.join(', ')}
              </p>
            )}

            <p className="disc-detail__overview">{tmdbMovie.overview}</p>

            {tmdbMovie.directors.length > 0 && (
              <p className="disc-detail__crew">
                <strong>
                  Director{tmdbMovie.directors.length > 1 ? 's' : ''}:
                </strong>{' '}
                {tmdbMovie.directors.join(', ')}
              </p>
            )}

            {tmdbMovie.cast.length > 0 && (
              <p className="disc-detail__cast">
                <strong>Cast:</strong> {tmdbMovie.cast.join(', ')}
              </p>
            )}

            {/* Watched toggle */}
            <IonButton
              expand="block"
              fill={disc.watched ? 'solid' : 'outline'}
              onClick={() => void toggleWatched()}
              className="ion-margin-bottom"
            >
              {disc.watched ? '✓ Watched' : 'Mark as Watched'}
            </IonButton>
            {disc.watched && (
              <p className="disc-detail__watch-count">
                Watched {disc.watchCount} time{disc.watchCount !== 1 ? 's' : ''}
              </p>
            )}

            {/* Star rating */}
            <StarRating
              rating={disc.rating}
              onRate={(r) => void setRating(r)}
            />

            {/* Notes */}
            <div className="disc-detail__notes">
              <label className="disc-detail__notes-label">Notes</label>
              <textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={() => void saveNotes()}
                rows={3}
                placeholder="Add a note..."
                className="disc-detail__notes-textarea"
              />
              {notesError && (
                <IonText color="danger">
                  <p className="disc-detail__notes-error">
                    Failed — tap to retry{' '}
                    <button
                      onClick={() => void saveNotes()}
                      className="disc-detail__notes-retry"
                    >
                      Retry
                    </button>
                  </p>
                </IonText>
              )}
            </div>

            {/* Delete */}
            <div className="disc-detail__delete">
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
                  <p className="disc-detail__delete-error">{deleteError}</p>
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
