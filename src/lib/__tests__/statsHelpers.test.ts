import { describe, it, expect } from 'vitest'
import { filterQualifiedDirectors, capGenres } from '../statsHelpers'
import type { DirectorStat, GenreStat } from '../../types/stats'

const makeDirector = (name: string, discCount: number): DirectorStat => ({
  name,
  discCount,
  watchedCount: 0,
  titles: [],
})

const makeGenre = (genre: string, count: number): GenreStat => ({
  genre,
  count,
})

describe('filterQualifiedDirectors', () => {
  it('returns only directors with discCount >= 2', () => {
    const directors = [
      makeDirector('Denis Villeneuve', 3),
      makeDirector('Christopher Nolan', 2),
      makeDirector('Solo Director', 1),
    ]
    const result = filterQualifiedDirectors(directors)
    expect(result).toHaveLength(2)
    expect(result.map((d) => d.name)).toEqual([
      'Denis Villeneuve',
      'Christopher Nolan',
    ])
  })

  it('returns an empty array when no directors qualify', () => {
    const directors = [makeDirector('Solo Director', 1)]
    expect(filterQualifiedDirectors(directors)).toHaveLength(0)
  })

  it('returns all directors when all qualify', () => {
    const directors = [
      makeDirector('Director A', 3),
      makeDirector('Director B', 2),
    ]
    expect(filterQualifiedDirectors(directors)).toHaveLength(2)
  })
})

describe('capGenres', () => {
  it('returns the first 5 genres when more than 5 are provided', () => {
    const genres = [
      makeGenre('Science Fiction', 5),
      makeGenre('Drama', 4),
      makeGenre('Action', 3),
      makeGenre('Thriller', 2),
      makeGenre('Adventure', 2),
      makeGenre('Comedy', 1),
    ]
    const result = capGenres(genres)
    expect(result).toHaveLength(5)
    expect(result.map((g) => g.genre)).toEqual([
      'Science Fiction',
      'Drama',
      'Action',
      'Thriller',
      'Adventure',
    ])
  })

  it('returns all genres when 5 or fewer are provided', () => {
    const genres = [makeGenre('Drama', 4), makeGenre('Action', 3)]
    expect(capGenres(genres)).toHaveLength(2)
  })

  it('returns an empty array when given an empty list', () => {
    expect(capGenres([])).toHaveLength(0)
  })
})
