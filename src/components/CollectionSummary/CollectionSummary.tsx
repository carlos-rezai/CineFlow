import type { CollectionStats } from '../../types/stats'
import { formatRuntime } from '../../lib/formatRuntime'
import { filterQualifiedDirectors, capGenres } from '../../lib/statsHelpers'
import './CollectionSummary.css'

interface CollectionSummaryProps {
  stats: CollectionStats | null
}

export function CollectionSummary({ stats }: CollectionSummaryProps) {
  if (!stats) return null

  const qualifiedDirectors = filterQualifiedDirectors(stats.directors)
  const topGenres = capGenres(stats.genres)

  return (
    <div className="collection-summary">
      <div className="summary-bar">
        <span>{stats.totalDiscs} discs</span>
        <span>
          {stats.unwatchedCount} unwatched ({stats.watchedPercent}%)
        </span>
        <span>{formatRuntime(stats.unwatchedRuntimeMinutes)}</span>
        {stats.averageRating !== null && (
          <span data-testid="average-rating">{stats.averageRating}</span>
        )}
      </div>

      {qualifiedDirectors.length > 0 && (
        <div className="director-breakdown">
          {qualifiedDirectors.map((d) => (
            <div
              key={d.name}
              className="director-row"
              data-testid="director-row"
            >
              <span>{d.name}</span>
              <span>
                {d.discCount} discs · {d.watchedCount}/{d.discCount} watched
              </span>
            </div>
          ))}
        </div>
      )}

      {topGenres.length > 0 && (
        <div className="genre-breakdown">
          {topGenres.map((g) => (
            <div key={g.genre} className="genre-row">
              <span>{g.genre}</span>
              <span>{g.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
