import { Router } from 'express'
import { getCandidates } from '../services/discService.js'
import { runDecisionPipeline } from '../../../ai/pipelines/decisionPipeline.js'

const router = Router()

router.post('/', async (_req, res) => {
  try {
    const result = await runDecisionPipeline(getCandidates)

    res.setHeader('Content-Type', 'application/x-ndjson')

    if (!result) {
      res.write(JSON.stringify({ type: 'empty' }) + '\n')
      res.end()
      return
    }

    res.write(
      JSON.stringify({
        type: 'result',
        topPick: result.topPick,
        runners: result.runners,
        reasons: result.reasons,
        last3Watched: result.last3Watched,
      }) + '\n',
    )

    try {
      for await (const token of result.explanationStream) {
        res.write(JSON.stringify({ type: 'token', text: token }) + '\n')
      }
      res.write(JSON.stringify({ type: 'done' }) + '\n')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Explanation failed'
      res.write(JSON.stringify({ type: 'error', message }) + '\n')
    }

    res.end()
  } catch {
    res.status(500).json({ error: 'Failed to process decision request' })
  }
})

export default router
