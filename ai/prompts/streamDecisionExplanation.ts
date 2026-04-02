import type { MoodCandidate } from '../../server/src/lib/scoreCandidates.js'

export async function streamDecisionExplanation(
  _topPick: MoodCandidate,
  _last3Watched: MoodCandidate[],
  _reasons: string[],
): Promise<AsyncGenerator<string>> {
  throw new Error('not implemented')
}
