import { Router } from 'express'
import {
  createDisc,
  listDiscs,
  getDisc,
  updateDisc,
  deleteDisc,
  checkDuplicate,
} from '../services/discService.js'
import { upsertTmdbMovie } from '../services/tmdbMovieService.js'
import type { DiscPatch } from '../types/index.js'

interface CreateDiscBody {
  barcode: string
  format: '4K' | 'Blu-ray' | 'DVD'
  tmdbId: number
  title: string
  year: number
  posterUrl: string
  overview: string
  runtime: number
  genres: string[]
  directors: string[]
  cast: string[]
  tmdbRating: number
  forceAdd?: boolean
}

const router = Router()

router.post('/', async (req, res) => {
  const body = req.body as CreateDiscBody
  const { barcode, format, tmdbId, forceAdd, ...tmdbFields } = body

  if (!forceAdd) {
    const isDuplicate = await checkDuplicate(barcode)
    if (isDuplicate) {
      res.status(200).json({ isDuplicate: true })
      return
    }
  }

  await upsertTmdbMovie({
    tmdbId,
    title: tmdbFields.title,
    year: tmdbFields.year,
    posterUrl: tmdbFields.posterUrl,
    overview: tmdbFields.overview,
    runtime: tmdbFields.runtime,
    genres: tmdbFields.genres,
    directors: tmdbFields.directors,
    cast: tmdbFields.cast,
    tmdbRating: tmdbFields.tmdbRating,
    cachedAt: new Date().toISOString(),
  })

  const disc = await createDisc({ barcode, format, tmdbId })
  res.status(201).json(disc)
})

router.get('/', async (req, res) => {
  const { watched } = req.query
  const filter =
    watched !== undefined ? { watched: watched === 'true' } : undefined
  const discs = await listDiscs(filter)
  res.json(discs)
})

router.get('/:id', async (req, res) => {
  const result = await getDisc(req.params.id)
  if (!result) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(result)
})

router.patch('/:id', async (req, res) => {
  const patch = req.body as DiscPatch
  const disc = await updateDisc(req.params.id, patch)
  if (!disc) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(disc)
})

router.delete('/:id', async (req, res) => {
  const deleted = await deleteDisc(req.params.id)
  if (!deleted) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.status(204).send()
})

export default router
