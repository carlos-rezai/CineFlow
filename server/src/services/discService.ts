import { ObjectId } from 'mongodb'
import { getDb } from '../lib/db.js'
import type {
  Disc,
  DiscListItem,
  TMDBMovie,
  CreateDiscInput,
  DiscPatch,
} from '../types/index.js'
import type { MoodCandidate } from '../lib/scoreCandidates.js'

export async function createDisc(input: CreateDiscInput): Promise<Disc> {
  const db = getDb()
  const doc: Omit<Disc, '_id'> = {
    barcode: input.barcode,
    format: input.format,
    tmdbId: input.tmdbId,
    addedAt: new Date().toISOString(),
    watched: false,
    lastWatchedAt: null,
    watchCount: 0,
    rating: null,
    notes: null,
  }
  const result = await db.collection<Disc>('discs').insertOne(doc as Disc)
  return { _id: result.insertedId, ...doc } as Disc
}

export async function listDiscs(filter?: {
  watched?: boolean
}): Promise<DiscListItem[]> {
  const db = getDb()
  const match = filter?.watched !== undefined ? { watched: filter.watched } : {}
  return db
    .collection('discs')
    .aggregate<DiscListItem>([
      { $match: match },
      {
        $lookup: {
          from: 'tmdb_movies',
          localField: 'tmdbId',
          foreignField: 'tmdbId',
          as: 'tmdbData',
        },
      },
      {
        $addFields: {
          posterUrl: {
            $ifNull: [{ $arrayElemAt: ['$tmdbData.posterUrl', 0] }, ''],
          },
          title: { $ifNull: [{ $arrayElemAt: ['$tmdbData.title', 0] }, ''] },
          year: { $ifNull: [{ $arrayElemAt: ['$tmdbData.year', 0] }, null] },
          runtime: {
            $ifNull: [{ $arrayElemAt: ['$tmdbData.runtime', 0] }, null],
          },
          tmdbRating: {
            $ifNull: [{ $arrayElemAt: ['$tmdbData.tmdbRating', 0] }, null],
          },
        },
      },
      { $project: { tmdbData: 0 } },
      { $sort: { addedAt: -1 } },
    ])
    .toArray()
}

export async function getDisc(
  id: string,
): Promise<{ disc: Disc; tmdbMovie: TMDBMovie } | null> {
  const db = getDb()
  const disc = await db
    .collection<Disc>('discs')
    .findOne({ _id: new ObjectId(id) })
  if (!disc) return null
  const tmdbMovie = await db
    .collection<TMDBMovie>('tmdb_movies')
    .findOne({ tmdbId: disc.tmdbId })
  if (!tmdbMovie) return null
  return { disc, tmdbMovie }
}

export async function updateDisc(
  id: string,
  patch: DiscPatch,
): Promise<Disc | null> {
  const db = getDb()
  return db
    .collection<Disc>('discs')
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: patch },
      { returnDocument: 'after' },
    )
}

export async function deleteDisc(id: string): Promise<boolean> {
  const db = getDb()
  const result = await db
    .collection<Disc>('discs')
    .deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount === 1
}

export async function checkDuplicate(barcode: string): Promise<boolean> {
  const db = getDb()
  const count = await db.collection<Disc>('discs').countDocuments({ barcode })
  return count > 0
}

export async function getCandidates(): Promise<MoodCandidate[]> {
  const db = getDb()
  return db
    .collection('discs')
    .aggregate<MoodCandidate>([
      {
        $lookup: {
          from: 'tmdb_movies',
          localField: 'tmdbId',
          foreignField: 'tmdbId',
          as: 'tmdbData',
        },
      },
      {
        $addFields: {
          title: { $arrayElemAt: ['$tmdbData.title', 0] },
          year: { $arrayElemAt: ['$tmdbData.year', 0] },
          posterUrl: { $arrayElemAt: ['$tmdbData.posterUrl', 0] },
          genres: { $arrayElemAt: ['$tmdbData.genres', 0] },
          runtime: { $arrayElemAt: ['$tmdbData.runtime', 0] },
          directors: { $arrayElemAt: ['$tmdbData.directors', 0] },
          tmdbRating: { $arrayElemAt: ['$tmdbData.tmdbRating', 0] },
        },
      },
      {
        $match: {
          runtime: { $gt: 0 },
          genres: { $exists: true, $ne: [] },
        },
      },
      {
        $project: {
          _id: 0,
          tmdbId: 1,
          title: 1,
          year: 1,
          posterUrl: 1,
          genres: 1,
          runtime: 1,
          directors: 1,
          watched: 1,
          watchCount: 1,
          lastWatchedAt: 1,
          rating: 1,
          tmdbRating: 1,
        },
      },
    ])
    .toArray()
}
