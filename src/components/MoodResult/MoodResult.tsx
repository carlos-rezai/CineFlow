import type { MoodCandidate } from '../../types/mood'

interface MoodResultProps {
  topPick: MoodCandidate
  runners: MoodCandidate[]
  explanation: string
  onReset: () => void
  resetLabel?: string
}

const MoodResult = ({
  topPick,
  runners,
  explanation,
  onReset,
  resetLabel = 'Try again',
}: MoodResultProps) => (
  <div className="mood-result">
    <TopPickCard candidate={topPick} explanation={explanation} />
    {runners.length > 0 && (
      <>
        <p className="mood-runners-label">Other Options</p>
        <div className="mood-runners">
          {runners.map((runner) => (
            <div
              key={runner.tmdbId}
              className="runner-card"
              data-testid="runner-card"
            >
              <div className="runner-card__image-wrap">
                <img
                  src={runner.posterUrl}
                  alt={runner.title}
                  className="runner-card__poster"
                />
              </div>
              <span className="runner-card__title">{runner.title}</span>
              <span className="runner-card__genres">
                {runner.genres.join(', ')}
              </span>
            </div>
          ))}
        </div>
      </>
    )}
    <button className="mood-reset-btn" onClick={onReset}>
      <span className="material-symbols-rounded">refresh</span>
      {resetLabel}
    </button>
  </div>
)

const TopPickCard = ({
  candidate,
  explanation,
}: {
  candidate: MoodCandidate
  explanation: string
}) => (
  <div className="top-pick-card">
    <div className="top-pick-card__image-wrap">
      <img
        src={candidate.posterUrl}
        alt={candidate.title}
        className="top-pick-card__poster"
      />
      <span className="top-pick-card__badge">AI PICK</span>
      <span className="top-pick-card__rating-badge">
        ★ {candidate.rating ?? '—'}
      </span>
    </div>
    <p className="top-pick-card__title">{candidate.title}</p>
    <p className="top-pick-card__meta">
      <span>{candidate.year}</span>
      {' · '}
      <span>{candidate.runtime} min</span>
      {' · '}
      <span>{candidate.genres.join(', ')}</span>
    </p>
    {explanation && (
      <>
        <p className="top-pick-card__explanation-label">
          <span className="material-symbols-rounded">auto_awesome</span>
          Curator's Note
        </p>
        <p className="top-pick-card__explanation">{explanation}</p>
      </>
    )}
  </div>
)

export default MoodResult
