import { Router } from 'express'
import { lookupUpc } from '../lib/upcClient.js'

const router = Router()

router.get('/:barcode', async (req, res) => {
  const title = await lookupUpc(req.params.barcode)
  res.json({ title })
})

export default router
