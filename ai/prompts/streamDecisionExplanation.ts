import { GoogleGenerativeAI } from '@google/generative-ai'
import type { MoodCandidate } from '../../server/src/lib/scoreCandidates.js'

export async function streamDecisionExplanation(
  topPick: MoodCandidate,
  last3Watched: MoodCandidate[],
  reasons: string[],
): Promise<AsyncIterable<string>> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const result = await model.generateContentStream(
    buildPrompt(topPick, last3Watched, reasons),
  )

  return (async function* () {
    for await (const chunk of result.stream) {
      yield chunk.text()
    }
  })()
}

function buildPrompt(
  topPick: MoodCandidate,
  last3Watched: MoodCandidate[],
  reasons: string[],
): string {
  const historyLines =
    last3Watched.length > 0
      ? last3Watched
          .map(
            (d) =>
              `- ${d.title}${d.rating ? ` (rated ${d.rating}/5)` : ''}${d.watchCount > 1 ? `, watched ${d.watchCount} times` : ''}`,
          )
          .join('\n')
      : 'No recent watches.'

  const reasonLines = reasons.map((r) => `- ${r}`).join('\n')

  return `You are helping a movie collector decide what to watch tonight. Based on their collection history, the algorithm selected "${topPick.title}" (${topPick.year}).

Why this was chosen:
${reasonLines}

Their recent watches:
${historyLines}

Write a 2–3 sentence personalised explanation of why "${topPick.title}" is the right pick. Reference at least one of the named reasons above and connect it to their viewing history. Be conversational and direct.`
}
