import { Router } from 'express'
import { getStats } from '../services/statsService.js'

const router = Router()

router.get('/', async (_req, res) => {
  const stats = await getStats()
  res.json(stats)
})

export default router
