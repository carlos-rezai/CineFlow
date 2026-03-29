import { Router } from 'express'
import { runMoodPipeline } from '../../../ai/pipelines/moodPipeline.js'
import { streamMoodExplanation } from '../../../ai/prompts/streamMoodExplanation.js'
import { getCandidates } from '../services/discService.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { tags, freeText } = req.body as { tags: string[]; freeText: string }
    const result = await runMoodPipeline({ tags, freeText }, getCandidates)

    if (!result.topPick) {
      res.setHeader('Content-Type', 'application/x-ndjson')
      res.write(JSON.stringify({ type: 'empty' }) + '\n')
      res.end()
      return
    }

    res.setHeader('Content-Type', 'application/x-ndjson')
    res.write(
      JSON.stringify({
        type: 'result',
        topPick: result.topPick,
        runners: result.runners,
      }) + '\n',
    )

    try {
      const stream = await streamMoodExplanation(
        { tags, freeText },
        result.topPick,
      )
      for await (const token of stream) {
        res.write(JSON.stringify({ type: 'token', text: token }) + '\n')
      }
      res.write(JSON.stringify({ type: 'done' }) + '\n')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Explanation failed'
      res.write(JSON.stringify({ type: 'error', message }) + '\n')
    }

    res.end()
  } catch {
    res.status(500).json({ error: 'Failed to process mood request' })
  }
})

export default router
