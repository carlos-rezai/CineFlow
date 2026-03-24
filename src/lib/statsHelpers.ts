import type { DirectorStat, GenreStat } from '../types/stats'

const DIRECTOR_MIN_DISC_COUNT = 2
const GENRE_DISPLAY_CAP = 5

export function filterQualifiedDirectors(
  directors: DirectorStat[],
): DirectorStat[] {
  return directors.filter((d) => d.discCount >= DIRECTOR_MIN_DISC_COUNT)
}

export function capGenres(genres: GenreStat[]): GenreStat[] {
  return genres.slice(0, GENRE_DISPLAY_CAP)
}
