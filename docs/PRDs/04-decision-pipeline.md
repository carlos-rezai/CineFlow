## Problem Statement

The mood engine requires the user to articulate their watch intent before producing a recommendation. Sometimes the user doesn't want to express a mood — they just want to be told what to watch. There is no way to get a recommendation from CineFlow without providing explicit input, creating unnecessary friction for the "just decide for me" use case.

## Solution

A **"Decide for me" mode** on the Watch tab that autonomously selects a disc based on watch history, ratings, variety patterns, and director completion — no input required. Switching to this mode triggers the decision pipeline immediately. The result is a top pick with a personalised AI-generated explanation that references the user's actual viewing history, plus up to 3 runners. The user can request a fresh pick at any time with a "Pick again" button.

The mood engine and decision pipeline coexist on the Watch tab through a mode toggle. Only one mode is visible at a time. Both modes share the same result area.

## User Stories

1. As a user, I want to switch to a "Decide for me" mode on the Watch tab, so that I can get a recommendation without having to express a mood.
2. As a user, I want the recommendation to appear automatically when I switch to "Decide for me" mode, so that there is no extra button to press.
3. As a user, I want the top pick to include the film title, poster, year, runtime, and genres, so that I have enough context to decide whether to watch it.
4. As a user, I want a streamed AI explanation for the top pick that references my actual watch history, so that the recommendation feels personal and justified.
5. As a user, I want to see up to 3 runner-up picks alongside the top pick, so that I have alternatives if the top pick doesn't appeal.
6. As a user, I want to tap "Pick again" to get a fresh recommendation, so that I can explore other options without switching modes.
7. As a user, I want the last result to still be visible when I navigate away and return to the Watch tab, so that I don't lose my recommendation mid-session.
8. As a user, I want the "Decide for me" mode to prefer unwatched discs, so that the pipeline surfaces films I haven't seen yet.
9. As a user, I want the pipeline to avoid recommending something I watched very recently, so that picks feel varied across sessions.
10. As a user, I want the pipeline to avoid recommending genres I've watched back-to-back, so that recommendations feel fresh rather than repetitive.
11. As a user, I want the pipeline to boost discs from directors I'm partway through in my collection, so that it helps me complete a director's work.
12. As a user, I want highly-rated discs to be preferred over unrated or low-rated ones, so that the pipeline surfaces films I already know I enjoy.
13. As a user, I want a clear empty state if I have no eligible discs, so that I understand why no recommendation was produced.
14. As a user, I want the Watch tab to default to Mood mode on first load, so that the established mood engine remains the primary entry point.
15. As a user, I want to switch back to Mood mode at any time, so that both features are always accessible.
16. As a user, I want the mode to reset to Mood when I refresh the page, so that the app starts in a consistent state.
17. As a user, I want an error state if the pipeline fails, so that I'm informed rather than seeing a frozen loading spinner.
18. As a user, I want the explanation to reference why the algorithm chose this specific disc (e.g. "you haven't watched a Villeneuve film since Arrival"), so that the reasoning feels grounded in my collection.

## Implementation Decisions

### Modules

**scoreDecisionCandidates (new — pure function)**

- Input: full `MoodCandidate[]` array
- Output: `{ topPick, runners, reasons, last3Watched } | null` (null only if candidates is empty)
- Derives all signals internally from the candidates array — no additional DB queries
- Signals applied:
  - **Recency penalty**: -2 if the disc appears in the last 3 watched discs (sorted by `lastWatchedAt` desc)
  - **Rating bonus**: +2 if `disc.rating` is 4 or 5; neutral if null
  - **Unwatched bonus**: +1 if `disc.watched` is false
  - **Director completion boost**: +1 if the user has watched >= 50% of that director's owned discs but has not watched this disc; uses first director only
  - **Variety penalty**: -1 per genre shared with the genres of the last 3 watched discs
  - **Tiebreaker**: `tmdbRating` (0-10, normalised), applied after all signals
- Produces `reasons: string[]` — human-readable named reasons for the top pick (e.g. `"director completion — 3 of 4 Villeneuve films watched"`)
- Returns top pick + up to 3 runners

**POST /api/decision (new endpoint)**

- No request body required
- Calls `getCandidates()` -> `scoreDecisionCandidates()` -> streams NDJSON
- Same NDJSON frame format as `POST /api/mood`:
  - `{"type":"result","topPick":{...},"runners":[...]}`
  - `{"type":"token","text":"..."}`
  - `{"type":"done"}`
  - `{"type":"empty"}` — only when candidates array is empty
  - `{"type":"error","message":"..."}` — after result frame if streaming fails
- Independently testable; no branching inside the mood route

**decisionPipeline (new)**

- Orchestrates `getCandidates()` -> `scoreDecisionCandidates()` -> `streamDecisionExplanation()`
- Follows the same pattern as `moodPipeline`

**streamDecisionExplanation (new Gemini prompt)**

- Input: top pick metadata + `last3Watched` (title, rating, watchCount) + `reasons: string[]`
- Gemini receives named reasons as human-readable strings — not raw score floats
- Streams 2-3 sentence personalised explanation referencing the user's actual history
- Model: `gemini-2.5-flash`

**useDecisionStream (new React hook)**

- Mirrors `useMoodStream` — same NDJSON fetch + TextDecoder loop
- No request body (POST with empty body)
- Manages state: `topPick`, `runners`, `explanation`, `status` (idle -> loading -> result/empty/error)
- Returns result so WatchPage can cache it in component state

**WatchPage (modified)**

- Mode toggle at top: "Mood" / "Decide for me" — React state, default Mood
- Mode not persisted; resets to Mood on page refresh
- Decision mode: auto-runs `useDecisionStream` on first switch to "Decide for me"
- Re-enter with cached result: shows result + "Pick again" button; does not auto-run again
- "Pick again" triggers a fresh run
- Empty and error states follow existing WatchPage patterns
- Mood mode rendering is unchanged

### Reused without modification

- `MoodCandidate` type (both frontend and AI layers)
- `MoodResult` component — same output shape (topPick + runners + streamed explanation)
- `getCandidates()` service — already Phase 4-ready
- NDJSON stream frame format

### Data model

No schema changes required. All signals derive from existing `Disc` and `TMDBMovie` fields: `watched`, `lastWatchedAt`, `watchCount`, `rating`, `genres`, `directors`, `runtime`, `tmdbRating`.

## Testing Decisions

**What makes a good test:**

- Tests external behaviour (inputs -> outputs), not implementation details
- Pure functions are tested with direct unit tests covering all signal combinations
- Gemini calls are mocked at the SDK boundary — never real API calls in tests
- NDJSON parsing is tested with partial buffer and multi-frame edge cases

**Modules to test:**

- `scoreDecisionCandidates` — full unit coverage:
  - All signals individually (recency, rating, unwatched, director completion, variety)
  - Signal combination and tiebreaker ordering
  - Empty input returns null
  - Small collections (< 4 candidates) produce valid results
  - Missing signal data (no ratings, no lastWatchedAt) contributes zero without error
  - Director completion threshold (exactly 50%, below 50%)

- `decisionPipeline` — unit tests with Gemini mocked:
  - Returns correct result + reasons shape
  - Streams tokens correctly
  - Handles empty candidates (returns null / empty state)

- `useDecisionStream` — NDJSON parse tests:
  - Prior art: `useMoodStream` tests — follow the same approach
  - Partial buffer handling, multi-frame lines, error frame after result frame

- `WatchPage` — component tests:
  - Mode toggle renders correct mode
  - Switching to "Decide for me" triggers the stream hook
  - Cached result displays with "Pick again" button
  - "Pick again" triggers a fresh run
  - Empty state renders when hook returns empty status
  - Error state renders when hook returns error status

## Out of Scope

- Time-of-day or day-of-week signals — overengineering for a personal tool
- Session-level watch history — `lastWatchedAt` and `watchCount` on Disc are sufficient
- User-configurable signal weights
- Persisting the last result across page refreshes
- Cast-based signals — directors are a stronger, cleaner signal
- Comparison against a director's full filmography (beyond owned discs)

## Further Notes

- Director completion uses the first director in `TMDBMovie.directors` only. Co-directed films may score inconsistently — acceptable for Phase 4.
- The decision pipeline is independent from the mood engine. They share the Watch tab UI and the `MoodCandidate` / `MoodResult` types, but their routes, pipelines, prompts, hooks, and scoring functions are separate.
- Signal weighting is intentionally opinionated and not user-configurable. Tuning is a future concern if usage reveals poor picks.
- See design log `04-decision-pipeline.md` for full Q&A and architectural rationale.
