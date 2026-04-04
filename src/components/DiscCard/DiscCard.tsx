import { useHistory } from 'react-router-dom'
import type { DiscSummary } from '../../types/disc'
import './DiscCard.css'

interface DiscCardProps {
  disc: DiscSummary
}

const FORMAT_LABELS: Record<DiscSummary['format'], string> = {
  '4K': '4K ULTRA HD',
  'Blu-ray': 'BLU-RAY',
  DVD: 'DVD',
}

const DiscCard = ({ disc }: DiscCardProps) => {
  const history = useHistory()

  return (
    <div
      className="disc-card"
      onClick={() => history.push(`/disc/${disc._id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && history.push(`/disc/${disc._id}`)}
    >
      <div className="disc-card__poster-wrap">
        <img
          src={disc.posterUrl || undefined}
          alt={disc.title}
          className="disc-card__poster"
        />
        <span className="disc-card__format-badge">
          {FORMAT_LABELS[disc.format]}
        </span>
        {disc.watched && (
          <div className="disc-card__watched-overlay" aria-label="Watched">
            <span className="material-symbols-rounded">check_circle</span>
          </div>
        )}
      </div>
      <span className="disc-card__title">{disc.title}</span>
    </div>
  )
}

export default DiscCard
