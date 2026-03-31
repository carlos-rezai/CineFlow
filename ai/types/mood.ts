export interface MoodInput {
  tags: string[]
  freeText: string
}

export interface MoodAttributes {
  genres: Record<string, number>
  runtimePreference: 'short' | 'any' | 'long'
  preferUnwatched: boolean
}

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
