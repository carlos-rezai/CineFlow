import { useState, useContext } from 'react'
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonPage,
  useIonViewWillEnter,
} from '@ionic/react'
import AppHeader from '../components/AppHeader'
import AddDiscModal from '../components/AddDiscModal'
import DiscCard from '../components/DiscCard'
import { useCollection } from '../hooks/useCollection'
import type { WatchedFilter } from '../hooks/useCollection'
import { CollectionRefreshContext } from '../context/CollectionRefreshContext'
import './CollectionPage.css'

const FILTERS: { value: WatchedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unwatched', label: 'Unwatched' },
  { value: 'watched', label: 'Watched' },
]

const CollectionPage = () => {
  const { discs, filter, setFilter, refresh } = useCollection()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const refreshRef = useContext(CollectionRefreshContext)

  // Update ref synchronously during render — no async gap, never stale
  refreshRef.current = refresh

  useIonViewWillEnter(() => {
    void refreshRef.current()
  })

  return (
    <IonPage>
      <AppHeader />

      <IonContent>
        <div className="collection-hero">
          <span className="text-section collection-hero__eyebrow">
            Private Vault
          </span>
          <h1 className="text-hero collection-hero__title">CINEFLOW</h1>
        </div>

        <div className="collection-filters">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              className={`collection-filter-btn${filter === value ? ' collection-filter-btn--active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="poster-grid">
          {discs.map((disc) => (
            <DiscCard key={disc._id} disc={disc} />
          ))}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setIsModalOpen(true)}>
            <span className="material-symbols-rounded">add</span>
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
