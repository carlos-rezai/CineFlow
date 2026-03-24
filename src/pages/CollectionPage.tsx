import { useState, useContext } from 'react'
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
  useIonViewWillEnter,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import AddDiscModal from '../components/AddDiscModal'
import DiscCard from '../components/DiscCard'
import { CollectionSummary } from '../components/CollectionSummary'
import { useCollection } from '../hooks/useCollection'
import type { WatchedFilter } from '../hooks/useCollection'
import { useStats } from '../hooks/useStats'
import { CollectionRefreshContext } from '../context/CollectionRefreshContext'

const CollectionPage = () => {
  const { discs, filter, setFilter, refresh, refreshToken } = useCollection()
  const { stats } = useStats(refreshToken)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const refreshRef = useContext(CollectionRefreshContext)

  // Update ref synchronously during render — no async gap, never stale
  refreshRef.current = refresh

  useIonViewWillEnter(() => {
    void refreshRef.current()
  })

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
        <CollectionSummary stats={stats} />
        <div className="poster-grid">
          {discs.map((disc) => (
            <DiscCard key={disc._id} disc={disc} />
          ))}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setIsModalOpen(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <AddDiscModal
          isOpen={isModalOpen}
          onDidDismiss={() => {
            setIsModalOpen(false)
            void refresh()
          }}
        />
      </IonContent>
    </IonPage>
  )
}

export default CollectionPage
