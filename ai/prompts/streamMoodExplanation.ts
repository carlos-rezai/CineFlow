import { GoogleGenerativeAI } from '@google/generative-ai'
import type { MoodInput, MoodCandidate } from '../types/mood.js'

export async function streamMoodExplanation(
  input: MoodInput,
  topPick: MoodCandidate,
): Promise<AsyncIterable<string>> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const result = await model.generateContentStream(buildPrompt(input, topPick))

  return (async function* () {
    for await (const chunk of result.stream) {
      yield chunk.text()
    }
  })()
}

function buildPrompt(input: MoodInput, topPick: MoodCandidate): string {
  const parts: string[] = []
  if (input.tags.length > 0) parts.push(`Mood tags: ${input.tags.join(', ')}`)
  if (input.freeText) parts.push(`Additional context: ${input.freeText}`)

  const moodDescription =
    parts.length > 0 ? parts.join('\n') : 'No specific mood described.'

  return `You are helping a movie collector decide what to watch. They described their mood as follows:

${moodDescription}

Based on their mood, the top recommendation is "${topPick.title}" (${topPick.year}).

Write a 2–3 sentence conversational explanation of why "${topPick.title}" is a great match for their mood. Reference the mood they described. Be direct and enthusiastic.`
}
