import { useState, useEffect } from 'react'
import { IonContent, IonPage } from '@ionic/react'
import { useMoodStream } from '../hooks/useMoodStream'
import { useDecisionStream } from '../hooks/useDecisionStream'
import MoodInput from '../components/MoodInput'
import MoodResult from '../components/MoodResult'
import AppHeader from '../components/AppHeader'
import './WatchPage.css'

const MOOD_TAGS = [
  'Intense',
  'Chill',
  'Dark',
  'Uplifting',
  'Quick Watch',
  'Epic Night',
  'Comfort Rewatch',
  'Something New',
] as const

type Mode = 'mood' | 'decide'

const WatchPage = () => {
  const [mode, setMode] = useState<Mode>('mood')

  const {
    status: moodStatus,
    topPick: moodTopPick,
    runners: moodRunners,
    explanation: moodExplanation,
    submit,
    reset,
  } = useMoodStream()
  const {
    status: decideStatus,
    topPick: decideTopPick,
    runners: decideRunners,
    explanation: decideExplanation,
    run,
  } = useDecisionStream()

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')

  useEffect(() => {
    if (mode === 'decide' && decideStatus === 'idle') {
      run()
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const canSubmit = selectedTags.length > 0 || freeText.trim().length > 0

  const handleSubmit = () => {
    submit({ tags: selectedTags, freeText })
  }

  return (
    <IonPage>
      <AppHeader />
      <IonContent className="watch-content">
        <div className="watch-page">
          {/* Curator AI hero card */}
          <div className="curator-hero">
            <span className="material-symbols-rounded curator-hero__icon">
              auto_awesome
            </span>
            <p className="curator-hero__name text-sub">Curator AI</p>
            <p className="curator-hero__tagline text-section">
              What are we feeling tonight?
            </p>
          </div>

          {/* Mode toggle */}
          <div className="mode-toggle">
            <button
              role="button"
              aria-pressed={mode === 'mood'}
              className={`mode-toggle__btn${mode === 'mood' ? ' mode-toggle__btn--active' : ''}`}
              onClick={() => setMode('mood')}
            >
              Mood
            </button>
            <button
              role="button"
              aria-pressed={mode === 'decide'}
              className={`mode-toggle__btn${mode === 'decide' ? ' mode-toggle__btn--active' : ''}`}
              onClick={() => setMode('decide')}
            >
              Decide for me
            </button>
          </div>

          {mode === 'mood' && (
            <>
              {(moodStatus === 'idle' || moodStatus === 'loading') && (
                <MoodInput
                  tags={MOOD_TAGS}
                  selectedTags={selectedTags}
                  onToggleTag={toggleTag}
                  freeText={freeText}
                  onFreeTextChange={setFreeText}
                  onSubmit={handleSubmit}
                  canSubmit={canSubmit}
                  disabled={moodStatus === 'loading'}
                />
              )}

              {moodStatus === 'result' && moodTopPick && (
                <MoodResult
                  topPick={moodTopPick}
                  runners={moodRunners}
                  explanation={moodExplanation}
                  onReset={reset}
                />
              )}

              {moodStatus === 'empty' && (
                <div data-testid="mood-empty" className="mood-empty">
                  <p>
                    Nothing in your collection matches right now. Try different
                    tags.
                  </p>
                  <button onClick={reset}>Try again</button>
                </div>
              )}

              {moodStatus === 'error' && (
                <div data-testid="mood-error" className="mood-error">
                  <p>Something went wrong.</p>
                  <button onClick={reset}>Try again</button>
                </div>
              )}
            </>
          )}

          {mode === 'decide' && (
            <>
              {decideStatus === 'result' && decideTopPick && (
                <MoodResult
                  topPick={decideTopPick}
                  runners={decideRunners}
                  explanation={decideExplanation}
                  onReset={run}
                  resetLabel="Pick again"
                />
              )}

              {decideStatus === 'empty' && (
                <div data-testid="mood-empty" className="mood-empty">
                  <p>
                    Nothing in your collection matches right now. Try different
                    tags.
                  </p>
                  <button onClick={run}>Try again</button>
                </div>
              )}

              {decideStatus === 'error' && (
                <div data-testid="mood-error" className="mood-error">
                  <p>Something went wrong.</p>
                  <button onClick={run}>Try again</button>
                </div>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default WatchPage
