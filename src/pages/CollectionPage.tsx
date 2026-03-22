import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import DiscCard from '../components/DiscCard'
import { useCollection } from '../hooks/useCollection'
import type { WatchedFilter } from '../hooks/useCollection'

const CollectionPage = () => {
  const { discs, filter, setFilter } = useCollection()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Collection</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            value={filter}
            onIonChange={(e) => setFilter(e.detail.value as WatchedFilter)}
          >
            <IonSegmentButton value="all">
              <IonLabel>All</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="unwatched">
              <IonLabel>Unwatched</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="watched">
              <IonLabel>Watched</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="poster-grid">
          {discs.map((disc) => (
            <DiscCard key={disc._id} disc={disc} />
          ))}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  )
}

export default CollectionPage
