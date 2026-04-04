import { useState } from 'react'
import { IonHeader, IonToolbar, IonButtons } from '@ionic/react'
import StatsModal from '../StatsModal/StatsModal'
import './AppHeader.css'

const AppHeader = () => {
  const [statsOpen, setStatsOpen] = useState(false)

  return (
    <>
      <IonHeader className="app-header">
        <IonToolbar className="app-header__toolbar">
          <span slot="start" className="app-header__logo">
            CINEFLOW
          </span>
          <IonButtons slot="end">
            <button
              className="app-header__stats-btn"
              onClick={() => setStatsOpen(true)}
              aria-label="Open collection stats"
            >
              <span className="material-symbols-rounded">bar_chart</span>
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <StatsModal isOpen={statsOpen} onDismiss={() => setStatsOpen(false)} />
    </>
  )
}

export default AppHeader
