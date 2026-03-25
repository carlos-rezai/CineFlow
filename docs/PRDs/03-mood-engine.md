## Problem Statement

The user owns a Collection of Discs but has no way to answer "what should I watch right now?" based on their current mood. Browsing the full Collection is slow and requires knowing what you want before you know what you want. There is no intelligent layer that maps how the user feels to what they own.

## Solution

A mood engine that accepts a MoodInput (preset MoodTags + optional free text), uses Gemini to extract structured MoodAttributes (genre weights, runtime preference, rewatch preference), scores the candidate pool deterministically, and returns a topPick with a streamed AI explanation plus up to 3 runners. Accessible via a new Watch tab at `/watch`.

## User Stories

1. As a collector, I want to select one or more preset mood tags, so that I can quickly express what I'm in the mood for without typing anything.
2. As a collector, I want to type free text alongside my mood tags, so that I can express nuance that preset tags don't cover.
3. As a collector, I want to submit my mood and receive a single clear recommendation, so that I don't have to evaluate a ranked list myself.
4. As a collector, I want to see the film's poster, title, and year on the recommendation card, so that I can immediately identify the pick.
5. As a collector, I want to read a short AI-generated explanation that references what I said, so that I understand why this disc was chosen for my mood.
6. As a collector, I want the explanation to stream in progressively, so that I see a response immediately rather than waiting for it to complete.
7. As a collector, I want to see up to 3 alternative picks below the top recommendation, so that I have an escape hatch if the top pick doesn't appeal.
8. As a collector, I want the alternatives to appear immediately (without waiting for AI), so that I have options while the explanation is still streaming.
9. As a collector, I want a "Try again" button that returns me to the mood input, so that I can refine my mood or try a different combination.
10. As a collector, I want the mood input to offer a "Something New" tag that restricts recommendations to Discs I haven't watched, so that I can discover unwatched films when I want something fresh.
11. As a collector, I want the "Something New" filter to never be silently relaxed, so that I'm not shown rewatches when I specifically asked for something new.
12. As a collector, I want the mood engine to respect "Quick Watch" by favouring films under 100 minutes, so that I get appropriate recommendations when I have limited time.
13. As a collector, I want the mood engine to respect "Epic Night" by favouring films 150 minutes or longer, so that I get appropriately substantial recommendations when I want a big movie experience.
14. As a collector, I want to be told clearly when no Discs match my mood, so that I understand why there are no results rather than seeing a broken state.
15. As a collector, I want the mood engine to still show the top pick and runners even if the AI explanation fails, so that I always get at least a deterministic recommendation.
16. As a collector, I want the mood engine accessible from a persistent Watch tab in the navigation bar, so that it's always one tap away.
17. As a collector, I want the Watch tab to feel like a distinct experience from browsing my Collection, so that the two modes don't compete for space.
18. As a collector, I want to use the "Comfort Rewatch" tag to find films I've already seen that match my mood, so that I can revisit favourites intentionally.
19. As a collector, I want the recommendation to be based on my actual Collection, so that I'm never shown a film I don't own.
20. As a collector, I want the mood engine to work on mobile in portrait orientation, so that it fits naturally into my phone usage pattern.

## Implementation Decisions

### MoodInput and MoodTags

- MoodInput consists of zero or more MoodTags and an optional free text string. Both are sent to Gemini together.
- Eight MoodTags are locked: **Intense**, **Chill**, **Dark**, **Uplifting**, **Quick Watch**, **Epic Night**, **Comfort Rewatch**, **Something New**.
- Tags are multi-select. Free text is optional and supplements tags.

### MoodAttributes (Gemini output — call 1)

- Gemini extracts MoodAttributes from the MoodInput using structured output (`responseMimeType: "application/json"` + `responseSchema`). No manual JSON parsing.
- MoodAttributes contains:
  - `genres`: `Record<string, number>` — genre name to weight (0–1 float)
  - `runtimePreference`: `'short' | 'any' | 'long'`
  - `preferUnwatched`: `boolean`

### Candidate Pool

- A new `GET /api/discs/candidates` endpoint returns all joined Disc+TMDBMovie documents where `runtime` is known AND `genres` is non-empty. This is the Phase 4-ready candidate shape (includes tmdbId, directors, watchCount, lastWatchedAt, rating).
- If `preferUnwatched` is true, watched Discs are excluded from the candidate pool before scoring. This is a hard filter — it is never silently relaxed. If no candidates remain, return an empty state.

### Scoring Formula

- `score = genreScore + runtimeBonus`
- `genreScore` = sum of `moodAttributes.genres[genre]` for each genre the MoodCandidate shares with MoodAttributes
- `runtimeBonus` = a fixed constant (0.5) applied when the MoodCandidate's runtime fits `runtimePreference`
- Runtime thresholds are named constants: short < 100 min, long >= 150 min
- Scoring is purely deterministic — Gemini does not select the topPick

### Output

- topPick: the highest-scored MoodCandidate
- runners: up to 3 next-highest MoodCandidates (deterministic, no AI call)
- explanation: a streamed 2–3 sentence conversational string for the topPick only, referencing the user's original MoodInput and explaining why the pick fits. Written like a knowledgeable friend.
- If fewer than 4 candidates exist, return what is available. 0 candidates → empty state.

### Server Architecture

- Single `POST /api/mood` endpoint runs the full pipeline and streams NDJSON.
- Both Gemini calls are server-side. The API key never reaches the browser.
- Stream format: NDJSON with a `type` discriminator field.
  - First frame: `{"type":"result","topPick":{...},"runners":[...]}`
  - Subsequent frames: `{"type":"token","text":"..."}`
  - Final frame: `{"type":"done"}`
  - Empty state: `{"type":"empty"}`
  - Partial error (explanation failed): `{"type":"error","message":"..."}`

### Error Handling

- Gemini call 1 fails → HTTP 500 (attributes required; no result possible)
- 0 candidates after filtering → stream `{"type":"empty"}` with a user-facing message
- Gemini call 2 fails → stream topPick + runners as normal, then emit `{"type":"error"}`. Never discard deterministic results because AI failed.

### UI Architecture

- New `/watch` route under a "Watch" tab (tab bar: Collection | Watch).
- Two UI states: `idle` (MoodInput form) and `result` (full-screen topPick card + streaming explanation + runners).
- "Try again" button in result state resets to idle.
- Client uses a plain `fetch()` with a `TextDecoder` loop to parse the NDJSON stream. No SSE, no EventSource.

## Testing Decisions

A good test verifies observable behaviour through the module's public interface — not implementation details or internal state. Tests should be written against the function's contract: given these inputs, produce this output.

### Modules to test

- **`scoreCandidates()` pure function** — given MoodAttributes and a list of MoodCandidates, returns a correctly ranked array. Test genre weight accumulation, runtimeBonus application, empty genre matches, threshold edge cases (99 min, 100 min, 149 min, 150 min), `preferUnwatched` hard filter, and behaviour with fewer than 4 candidates.
- **Runtime threshold constants** — verify constant values match the agreed thresholds (short < 100, long >= 150).
- **Client NDJSON stream parser** — given a sequence of NDJSON lines, correctly identifies frame types and extracts values. Test each frame type, malformed lines, and partial buffers.
- **`moodPipeline` orchestration** — with Gemini mocked at the SDK boundary, verify: correct call order, correct data passed to each call, correct NDJSON frames emitted, empty state when no candidates, error frame when explanation call fails without dropping the result frame.

### No integration test

No test hits the real Gemini API. The mocked boundary is the Gemini SDK, not an internal abstraction — this is acceptable. Integration tests for AI calls are flaky and costly.

## Out of Scope

- Director or tone keyword attributes in MoodAttributes (Phase 4 concern)
- Caching mood results (personal-scale; freshness preferred over cache complexity)
- Multiple top picks with individual AI explanations (cost and latency)
- Silently relaxing `preferUnwatched` when the candidate pool is thin (violates user intent)
- TMDB filmography lookup for any purpose
- Saving or replaying past mood sessions
- Sharing recommendations

## Further Notes

- This is the first feature to establish the `ai/prompts/` and `ai/pipelines/` module patterns. Every subsequent AI feature will follow the same structure.
- The `GET /api/discs/candidates` endpoint is designed to be consumed by Phase 4's decision pipeline with no rework — the shape is deliberately Phase 4-ready.
- The Watch tab is intentionally named "Watch" not "Mood" — Phase 4's decision pipeline will live in the same tab.
- Gemini model: `gemini-2.0-flash` (per project convention — never change this without an explicit decision).
