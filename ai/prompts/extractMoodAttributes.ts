import { GoogleGenerativeAI } from '@google/generative-ai'
import type { MoodAttributes, MoodInput } from '../types/mood.js'

export type { MoodInput }

export async function extractMoodAttributes(
  input: MoodInput,
): Promise<MoodAttributes> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent(buildPrompt(input))
  return JSON.parse(result.response.text()) as MoodAttributes
}

function buildPrompt(input: MoodInput): string {
  const parts: string[] = []
  if (input.tags.length > 0) parts.push(`Mood tags: ${input.tags.join(', ')}`)
  if (input.freeText) parts.push(`Additional context: ${input.freeText}`)

  return `You help a movie collector decide what to watch. Given the mood input below, extract watch intent as structured attributes.

${parts.join('\n')}

Return valid JSON with exactly this structure:
{
  "genres": { "<TMDB genre name>": <weight 0.0–1.0>, ... },
  "runtimePreference": "short" | "any" | "long",
  "preferUnwatched": true | false
}

Use standard TMDB genres: Action, Adventure, Animation, Comedy, Crime, Documentary, Drama, Family, Fantasy, History, Horror, Music, Mystery, Romance, Science Fiction, Thriller, TV Movie, War, Western.
runtimePreference: "short" for under 100 min, "any" for no preference, "long" for 150 min or more.
preferUnwatched: true only if the mood explicitly suggests wanting something new or unseen.`
}
