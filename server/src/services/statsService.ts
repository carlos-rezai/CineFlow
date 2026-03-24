import { getDb } from '../lib/db.js'
import type {
  CollectionStats,
  DirectorStat,
  GenreStat,
} from '../types/index.js'

export async function getStats(): Promise<CollectionStats> {
  const db = getDb()

  const [result] = await db
    .collection('discs')
    .aggregate<CollectionStats>([
      {
        $lookup: {
          from: 'tmdb_movies',
          localField: 'tmdbId',
          foreignField: 'tmdbId',
          as: 'tmdb',
        },
      },
      {
        $addFields: {
          tmdb: { $arrayElemAt: ['$tmdb', 0] },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscs: { $sum: 1 },
          watchedCount: { $sum: { $cond: ['$watched', 1, 0] } },
          totalWatchCount: { $sum: '$watchCount' },
          totalRuntimeMinutes: { $sum: { $ifNull: ['$tmdb.runtime', 0] } },
          unwatchedRuntimeMinutes: {
            $sum: {
              $cond: [
                { $eq: ['$watched', false] },
                { $ifNull: ['$tmdb.runtime', 0] },
                0,
              ],
            },
          },
          ratingSum: {
            $sum: { $cond: [{ $ne: ['$rating', null] }, '$rating', 0] },
          },
          ratingCount: {
            $sum: { $cond: [{ $ne: ['$rating', null] }, 1, 0] },
          },
          formats4K: { $sum: { $cond: [{ $eq: ['$format', '4K'] }, 1, 0] } },
          formatsBluray: {
            $sum: { $cond: [{ $eq: ['$format', 'Blu-ray'] }, 1, 0] },
          },
          formatsDVD: { $sum: { $cond: [{ $eq: ['$format', 'DVD'] }, 1, 0] } },
          allGenres: { $push: { $ifNull: ['$tmdb.genres', []] } },
          directorEntries: {
            $push: {
              directors: { $ifNull: ['$tmdb.directors', []] },
              title: { $ifNull: ['$tmdb.title', ''] },
              watched: '$watched',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalDiscs: 1,
          watchedCount: 1,
          unwatchedCount: { $subtract: ['$totalDiscs', '$watchedCount'] },
          watchedPercent: {
            $round: [
              {
                $multiply: [{ $divide: ['$watchedCount', '$totalDiscs'] }, 100],
              },
              1,
            ],
          },
          totalWatchCount: 1,
          totalRuntimeMinutes: 1,
          unwatchedRuntimeMinutes: 1,
          averageRating: {
            $cond: [
              { $eq: ['$ratingCount', 0] },
              null,
              {
                $round: [{ $divide: ['$ratingSum', '$ratingCount'] }, 1],
              },
            ],
          },
          formatBreakdown: {
            '4K': '$formats4K',
            'Blu-ray': '$formatsBluray',
            DVD: '$formatsDVD',
          },
          allGenres: 1,
          directorEntries: 1,
        },
      },
    ])
    .toArray()

  if (!result) {
    return {
      totalDiscs: 0,
      watchedCount: 0,
      unwatchedCount: 0,
      watchedPercent: 0,
      totalWatchCount: 0,
      totalRuntimeMinutes: 0,
      unwatchedRuntimeMinutes: 0,
      averageRating: null,
      formatBreakdown: { '4K': 0, 'Blu-ray': 0, DVD: 0 },
      genres: [],
      directors: [],
    }
  }

  // Build genre stats from the nested arrays
  const genreMap = new Map<string, number>()
  for (const genreList of (result as unknown as { allGenres: string[][] })
    .allGenres ?? []) {
    for (const g of genreList) {
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1)
    }
  }
  const genres: GenreStat[] = [...genreMap.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)

  // Build director stats from the entries
  type DirectorEntry = { directors: string[]; title: string; watched: boolean }
  const directorMap = new Map<
    string,
    { discCount: number; watchedCount: number; titles: string[] }
  >()
  for (const entry of (
    result as unknown as { directorEntries: DirectorEntry[] }
  ).directorEntries ?? []) {
    for (const name of entry.directors) {
      const existing = directorMap.get(name) ?? {
        discCount: 0,
        watchedCount: 0,
        titles: [],
      }
      existing.discCount++
      if (entry.watched) existing.watchedCount++
      if (!existing.titles.includes(entry.title))
        existing.titles.push(entry.title)
      directorMap.set(name, existing)
    }
  }
  const directors: DirectorStat[] = [...directorMap.entries()]
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.discCount - a.discCount)

  return {
    ...(result as unknown as CollectionStats),
    genres,
    directors,
  }
}
