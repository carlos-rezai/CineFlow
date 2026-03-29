import { extractMoodAttributes } from '../prompts/extractMoodAttributes.js'
import { scoreCandidates } from '../../server/src/lib/scoreCandidates.js'
import type { MoodCandidate } from '../../server/src/lib/scoreCandidates.js'
import type { MoodInput } from '../prompts/extractMoodAttributes.js'

export type { MoodInput }

export interface MoodResult {
  topPick: MoodCandidate | null
  runners: MoodCandidate[]
}

export async function runMoodPipeline(
  input: MoodInput,
  getCandidatesFn: () => Promise<MoodCandidate[]>,
): Promise<MoodResult> {
  const attributes = await extractMoodAttributes(input)
  const candidates = await getCandidatesFn()
  const scored = scoreCandidates(attributes, candidates)

  if (scored.length === 0) {
    return { topPick: null, runners: [] }
  }

  return {
    topPick: scored[0],
    runners: scored.slice(1, 4),
  }
}
