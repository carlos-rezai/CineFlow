import { Router } from 'express'

// Stub — real UPC API calls implemented in Phase 2
const router = Router()

router.get('/:barcode', (_req, res) => {
  res.json({ title: null })
})

export default router
