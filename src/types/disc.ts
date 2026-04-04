export interface DiscSummary {
  _id: string
  barcode: string
  tmdbId: number
  format: '4K' | 'Blu-ray' | 'DVD'
  addedAt: string
  watched: boolean
  watchCount: number
  lastWatchedAt: string | null
  rating: 1 | 2 | 3 | 4 | 5 | null
  notes: string | null
  posterUrl: string
  title: string
  year: number | null
  runtime: number | null
  tmdbRating: number | null
}
