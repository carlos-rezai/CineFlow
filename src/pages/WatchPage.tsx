import { useState } from 'react'
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useMoodStream } from '../hooks/useMoodStream'
import MoodInput from '../components/MoodInput'
import MoodResult from '../components/MoodResult'

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

const WatchPage = () => {
  const { status, topPick, runners, explanation, submit, reset } =
    useMoodStream()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')

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
      <IonHeader>
        <IonToolbar>
          <IonTitle>Watch</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {(status === 'idle' || status === 'loading') && (
          <MoodInput
            tags={MOOD_TAGS}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            freeText={freeText}
            onFreeTextChange={setFreeText}
            onSubmit={handleSubmit}
            canSubmit={canSubmit}
            disabled={status === 'loading'}
          />
        )}

        {status === 'result' && topPick && (
          <MoodResult
            topPick={topPick}
            runners={runners}
            explanation={explanation}
            onReset={reset}
          />
        )}

        {status === 'empty' && (
          <div data-testid="mood-empty" className="mood-empty">
            <p>
              Nothing in your collection matches right now. Try different tags.
            </p>
            <button onClick={reset}>Try again</button>
          </div>
        )}

        {status === 'error' && (
          <div data-testid="mood-error" className="mood-error">
            <p>Something went wrong.</p>
            <button onClick={reset}>Try again</button>
          </div>
        )}
      </IonContent>
    </IonPage>
  )
}

export default WatchPage
