import { useParams } from 'react-router-dom'
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useDisc } from '../hooks/useDisc'

const DiscDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { disc, tmdbMovie, loading } = useDisc(id)

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
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>Cast:</strong> {tmdbMovie.cast.join(', ')}
              </p>
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  )
}

export default DiscDetailPage
