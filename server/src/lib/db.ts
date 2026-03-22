import { MongoClient, Db } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

export async function connect(uri: string, dbName = 'cineflow'): Promise<void> {
  client = new MongoClient(uri)
  await client.connect()
  db = client.db(dbName)
}

export async function disconnect(): Promise<void> {
  await client?.close()
  client = null
  db = null
}

export function getDb(): Db {
  if (!db) throw new Error('Not connected to MongoDB')
  return db
}
