import { Router } from 'express'

// Stub — real TMDB API calls implemented in Phase 2
const router = Router()

router.get('/search', (_req, res) => {
  res.json([])
})

export default router
