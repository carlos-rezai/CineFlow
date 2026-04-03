import { useState, useContext } from 'react'
import { useParams } from 'react-router-dom'
import { useHistory } from 'react-router-dom'
import {
  IonAlert,
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
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
        className={`star-rating__button${rating !== null && star <= rating ? ' star-rating__button--filled' : ''}`}
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
      <IonHeader className="disc-detail-header">
        <IonToolbar className="disc-detail-header__toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading && (
          <div className="disc-detail__spinner">
            <IonSpinner />
          </div>
        )}

        {!loading && disc && tmdbMovie && (
          <>
            {/* Hero */}
            <div className="disc-detail__hero">
              {tmdbMovie.posterUrl && (
                <img
                  src={tmdbMovie.posterUrl}
                  alt={tmdbMovie.title}
                  className="disc-detail__hero-poster"
                />
              )}
              <div className="disc-detail__hero-gradient" />
              <h1 className="disc-detail__hero-title text-hero">
                {tmdbMovie.title}
              </h1>
            </div>

            <div className="disc-detail__body">
              {/* Metadata row */}
              <div className="disc-detail__meta-row">
                <StarRating
                  rating={disc.rating}
                  onRate={(r) => void setRating(r)}
                />
                <span className="disc-detail__meta text-meta">
                  {tmdbMovie.year} · {tmdbMovie.runtime} MIN
                </span>
              </div>
              {tmdbMovie.genres.length > 0 && (
                <p className="disc-detail__genres text-meta">
                  {tmdbMovie.genres.join(' / ')}
                </p>
              )}

              {/* WATCH NOW / WATCHED button */}
              <button
                className={`disc-detail__watch-btn${disc.watched ? ' disc-detail__watch-btn--watched' : ''}`}
                onClick={() => void toggleWatched()}
              >
                <span className="material-symbols-rounded">
                  {disc.watched ? 'check_circle' : 'play_arrow'}
                </span>
                {disc.watched ? 'WATCHED' : 'WATCH NOW'}
              </button>
              {disc.watched && (
                <p className="disc-detail__watch-count text-meta">
                  WATCHED {disc.watchCount} TIME
                  {disc.watchCount !== 1 ? 'S' : ''}
                </p>
              )}

              {/* THE NARRATIVE */}
              {tmdbMovie.overview && (
                <>
                  <p className="disc-detail__section-label text-section">
                    The Narrative
                  </p>
                  <p className="disc-detail__overview text-body">
                    {tmdbMovie.overview}
                  </p>
                </>
              )}

              {/* DIRECTOR */}
              {tmdbMovie.directors.length > 0 && (
                <>
                  <p className="disc-detail__section-label text-section">
                    Director
                  </p>
                  <p className="disc-detail__director text-sub">
                    {tmdbMovie.directors.join(', ')}
                  </p>
                </>
              )}

              {/* LEAD ROLES */}
              {tmdbMovie.cast.length > 0 && (
                <>
                  <p className="disc-detail__section-label text-section">
                    Lead Roles
                  </p>
                  <div className="disc-detail__cast text-body">
                    {tmdbMovie.cast.map((name) => (
                      <p key={name}>{name}</p>
                    ))}
                  </div>
                </>
              )}

              {/* RATE THIS FILM */}
              <p className="disc-detail__section-label text-section">
                Rate This Film
              </p>
              <StarRating
                rating={disc.rating}
                onRate={(r) => void setRating(r)}
              />

              {/* NOTES */}
              <p className="disc-detail__section-label text-section">Notes</p>
              <textarea
                value={localNotes ?? ''}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={() => void saveNotes()}
                rows={4}
                placeholder="Add a note..."
                className="disc-detail__notes-textarea"
              />
              {notesError && (
                <p className="disc-detail__notes-error">
                  Failed —{' '}
                  <button
                    onClick={() => void saveNotes()}
                    className="disc-detail__notes-retry"
                  >
                    Retry
                  </button>
                </p>
              )}

              {/* REMOVE FROM COLLECTION */}
              <button
                className="disc-detail__remove-btn"
                onClick={() => setShowDeleteConfirm(true)}
              >
                REMOVE FROM COLLECTION
              </button>
              {deleteError && (
                <p className="disc-detail__delete-error">{deleteError}</p>
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
