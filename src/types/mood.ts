// MoodCandidate intentionally duplicates the server-side definition in
// ai/types/mood.ts. These are separate compile targets and the shapes are
// expected to diverge as the feature evolves. Same pattern as TmdbCandidate.
export interface MoodCandidate {
  tmdbId: number
  title: string
  year: number
  posterUrl: string
  genres: string[]
  runtime: number
  directors: string[]
  watched: boolean
  watchCount: number
  lastWatchedAt: string | null
  rating: 1 | 2 | 3 | 4 | 5 | null
}

export interface MoodInput {
  tags: string[]
  freeText: string
}

export type MoodStatus = 'idle' | 'loading' | 'result' | 'empty' | 'error'

export type MoodFrame =
  | { type: 'result'; topPick: MoodCandidate; runners: MoodCandidate[] }
  | { type: 'token'; text: string }
  | { type: 'done' }
  | { type: 'empty' }
  | { type: 'error'; message: string }

export interface UseMoodStreamResult {
  status: MoodStatus
  topPick: MoodCandidate | null
  runners: MoodCandidate[]
  explanation: string
  submit: (input: MoodInput) => void
  reset: () => void
}
