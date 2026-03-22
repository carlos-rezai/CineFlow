import { Router } from 'express'
import { searchTmdb } from '../lib/tmdbClient.js'

const router = Router()

router.get('/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : ''
  const candidates = await searchTmdb(q)
  res.json(candidates)
})

export default router
