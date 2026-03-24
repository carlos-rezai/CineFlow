export interface DirectorStat {
  name: string
  discCount: number
  watchedCount: number
  titles: string[]
}

export interface GenreStat {
  genre: string
  count: number
}

export interface CollectionStats {
  totalDiscs: number
  watchedCount: number
  unwatchedCount: number
  watchedPercent: number
  totalWatchCount: number
  totalRuntimeMinutes: number
  unwatchedRuntimeMinutes: number
  averageRating: number | null
  formatBreakdown: { '4K': number; 'Blu-ray': number; DVD: number }
  genres: GenreStat[]
  directors: DirectorStat[]
}
