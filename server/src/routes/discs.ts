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
import { getTmdbMovieDetails } from '../lib/tmdbClient.js'
import type { DiscPatch } from '../types/index.js'

interface CreateDiscBody {
  barcode: string
  format: '4K' | 'Blu-ray' | 'DVD'
  tmdbId: number
  forceAdd?: boolean
}

const router = Router()

router.post('/', async (req, res) => {
  const { barcode, format, tmdbId, forceAdd } = req.body as CreateDiscBody

  if (!barcode) {
    res.status(400).json({ error: 'barcode is required' })
    return
  }

  if (!forceAdd) {
    const isDuplicate = await checkDuplicate(barcode)
    if (isDuplicate) {
      res.status(409).json({ error: 'duplicate' })
      return
    }
  }

  const tmdbDetails = await getTmdbMovieDetails(tmdbId)
  if (!tmdbDetails) {
    res.status(502).json({ error: 'Failed to fetch TMDB metadata' })
    return
  }

  await upsertTmdbMovie(tmdbDetails)
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
