import { scoreDecisionCandidates } from '../../server/src/lib/scoreDecisionCandidates.js'
import { streamDecisionExplanation } from '../prompts/streamDecisionExplanation.js'
import type { MoodCandidate } from '../../server/src/lib/scoreCandidates.js'

export interface DecisionPipelineResult {
  topPick: MoodCandidate
  runners: MoodCandidate[]
  reasons: string[]
  last3Watched: MoodCandidate[]
  explanationStream: AsyncIterable<string>
}

export async function runDecisionPipeline(
  getCandidatesFn: () => Promise<MoodCandidate[]>,
): Promise<DecisionPipelineResult | null> {
  const candidates = await getCandidatesFn()
  const scored = scoreDecisionCandidates(candidates)

  if (!scored) return null

  const explanationStream = await streamDecisionExplanation(
    scored.topPick,
    scored.last3Watched,
    scored.reasons,
  )

  return {
    topPick: scored.topPick,
    runners: scored.runners,
    reasons: scored.reasons,
    last3Watched: scored.last3Watched,
    explanationStream,
  }
}
