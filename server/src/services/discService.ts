import { ObjectId } from 'mongodb'
import { getDb } from '../lib/db.js'
import type {
  Disc,
  TMDBMovie,
  CreateDiscInput,
  DiscPatch,
} from '../types/index.js'

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
}): Promise<Disc[]> {
  const db = getDb()
  const query = filter?.watched !== undefined ? { watched: filter.watched } : {}
  return db.collection<Disc>('discs').find(query).toArray()
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
