import { useHistory } from 'react-router-dom'
import type { DiscSummary } from '../types/disc'

interface DiscCardProps {
  disc: DiscSummary
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
      <div className="disc-card__poster">
        <img src={disc.posterUrl || undefined} alt={disc.title} />
        {disc.watched && (
          <div className="disc-card__watched-overlay" aria-label="Watched">
            ✓
          </div>
        )}
      </div>
    </div>
  )
}

export default DiscCard
