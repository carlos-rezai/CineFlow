import type { MoodCandidate } from '../types/mood'

interface MoodResultProps {
  topPick: MoodCandidate
  runners: MoodCandidate[]
  explanation: string
  onReset: () => void
}

const MoodResult = ({
  topPick,
  runners,
  explanation,
  onReset,
}: MoodResultProps) => (
  <div className="mood-result">
    <TopPickCard candidate={topPick} explanation={explanation} />
    {runners.length > 0 && (
      <div className="mood-runners">
        {runners.map((runner) => (
          <div
            key={runner.tmdbId}
            className="runner-card"
            data-testid="runner-card"
          >
            <img
              src={runner.posterUrl}
              alt={runner.title}
              className="runner-card__poster"
            />
            <span className="runner-card__title">{runner.title}</span>
            <span className="runner-card__year">{runner.year}</span>
          </div>
        ))}
      </div>
    )}
    <button className="mood-reset-btn" onClick={onReset}>
      Try again
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
    <img
      src={candidate.posterUrl}
      alt={candidate.title}
      className="top-pick-card__poster"
    />
    <span className="top-pick-card__title">{candidate.title}</span>
    <span className="top-pick-card__year">{candidate.year}</span>
    {explanation && <p className="top-pick-card__explanation">{explanation}</p>}
  </div>
)

export default MoodResult
