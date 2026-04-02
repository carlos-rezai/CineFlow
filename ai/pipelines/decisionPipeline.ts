import type { MoodCandidate } from '../../server/src/lib/scoreCandidates.js'

export interface DecisionPipelineResult {
  topPick: MoodCandidate
  runners: MoodCandidate[]
  reasons: string[]
  last3Watched: MoodCandidate[]
  explanationStream: AsyncGenerator<string>
}

export async function runDecisionPipeline(
  _getCandidatesFn: () => Promise<MoodCandidate[]>,
): Promise<DecisionPipelineResult | null> {
  throw new Error('not implemented')
}
