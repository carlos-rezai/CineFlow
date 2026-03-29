import { Router } from 'express'
import { runMoodPipeline } from '../../../ai/pipelines/moodPipeline.js'
import { getCandidates } from '../services/discService.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { tags, freeText } = req.body as { tags: string[]; freeText: string }
    const result = await runMoodPipeline({ tags, freeText }, getCandidates)
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Failed to process mood request' })
  }
})

export default router
