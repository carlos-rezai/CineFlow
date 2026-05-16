import { useState, useEffect } from 'react'
import { IonModal, IonContent } from '@ionic/react'
import { useStats } from '../../hooks/useStats'
import { formatRuntime } from '../../lib/formatRuntime'
import { capGenres } from '../../lib/statsHelpers'
import ModalCloseButton from '../ModalCloseButton/ModalCloseButton'
import './StatsModal.css'

interface StatsModalProps {
  isOpen: boolean
  onDismiss: () => void
}

const StatsModal = ({ isOpen, onDismiss }: StatsModalProps) => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { stats } = useStats(refreshKey)

  useEffect(() => {
    if (isOpen) setRefreshKey((k) => k + 1)
  }, [isOpen])

  const topGenres = stats ? capGenres(stats.genres) : []
  const maxGenreCount = topGenres.length > 0 ? topGenres[0].count : 1

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      initialBreakpoint={0.75}
      breakpoints={[0, 0.75, 1]}
    >
      <IonContent>
        <div className="stats-modal">
          <div className="stats-modal__header">
            <span className="stats-modal__title text-section">
              Collection Stats
            </span>
            <ModalCloseButton onClick={onDismiss} />
          </div>

          {stats && (
            <>
              <div className="stats-modal__grid">
                <div className="stats-card">
                  <span className="stats-card__label text-section">
                    Total Titles
                  </span>
                  <span className="stats-card__value">{stats.totalDiscs}</span>
                  <span className="stats-card__sub text-meta">total</span>
                </div>
                <div className="stats-card">
                  <span className="stats-card__label text-section">
                    Physical Media
                  </span>
                  <span className="stats-card__value">
                    {stats.formatBreakdown['4K']}
                  </span>
                  <span className="stats-card__sub text-meta">4K discs</span>
                </div>
                <div className="stats-card">
                  <span className="stats-card__label text-section">
                    Backlog
                  </span>
                  <span
                    className="stats-card__value"
                    style={
                      stats.unwatchedCount > 0
                        ? { color: '#f59e0b' }
                        : undefined
                    }
                  >
                    {stats.unwatchedCount}
                  </span>
                  <span className="stats-card__sub text-meta">
                    unwatched ({stats.watchedPercent}%)
                  </span>
                </div>
                <div className="stats-card">
                  <span className="stats-card__label text-section">
                    Playtime
                  </span>
                  <span className="stats-card__value stats-card__value--sm">
                    {formatRuntime(stats.unwatchedRuntimeMinutes)}
                  </span>
                  <span className="stats-card__sub text-meta">unplayed</span>
                </div>
              </div>

              {topGenres.length > 0 && (
                <div className="stats-modal__genres">
                  <span className="text-section stats-modal__section-label">
                    Genre Breakdown
                  </span>
                  {topGenres.map((g) => (
                    <div key={g.genre} className="genre-row">
                      <div className="genre-row__top">
                        <span className="genre-row__name text-body">
                          {g.genre}
                        </span>
                        <span className="genre-row__count text-meta">
                          {g.count}
                        </span>
                      </div>
                      <div className="genre-row__bar-track">
                        <div
                          className="genre-row__bar-fill"
                          style={{
                            width: `${(g.count / maxGenreCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonModal>
  )
}

export default StatsModal
