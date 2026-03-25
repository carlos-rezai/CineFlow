# Plan: Mood Engine

> Source PRD: https://github.com/carlos-rezai/CineFlow/issues/14

## Architectural decisions

- **Routes:** `GET /api/discs/candidates` — joined Disc+TMDBMovie, filtered to runtime known AND genres non-empty. `POST /api/mood` — full pipeline, NDJSON stream response.
- **Schema:** No schema changes. Mood engine reads existing `discs` and `tmdb_movies` collections.
- **Key models:** `MoodInput` (tags + freeText), `MoodAttributes` (genres Record, runtimePreference, preferUnwatched), `MoodCandidate` (joined disc+TMDB shape, Phase 4-ready), `MoodStreamFrame` (discriminated union of NDJSON frame types).
- **AI:** Two Gemini calls, both server-side. Call 1 uses structured output (`responseMimeType: "application/json"` + `responseSchema`) — no manual JSON parsing. Call 2 streams tokens. Model: `gemini-2.0-flash`.
- **Scoring:** Deterministic. `score = genreScore + runtimeBonus`. Constants: `RUNTIME_SHORT_MAX = 100`, `RUNTIME_LONG_MIN = 150`, `RUNTIME_BONUS = 0.5`. `preferUnwatched` is a hard pre-filter, never a penalty.
- **Stream format:** NDJSON with `type` discriminator. First frame is the full result (topPick + runners). Subsequent frames are explanation tokens. Final frame is `done`, `empty`, or `error`.
- **Navigation:** App.tsx gains IonTabs. Tab bar: Collection (`/collection`) | Watch (`/watch`).

---

## Phase 1: Candidate pool + deterministic scoring

**User stories:** 10 (Something New filter), 11 (never relax preferUnwatched), 12 (Quick Watch runtime), 13 (Epic Night runtime), 19 (recommendations from owned collection only)

### What to build

A `GET /api/discs/candidates` endpoint that returns all joined Disc+TMDBMovie documents where runtime is known and genres is non-empty — the complete Phase 4-ready shape (disc fields + TMDB fields including directors, watchCount, rating). Alongside it, a `scoreCandidates()` pure function that accepts MoodAttributes and a list of MoodCandidates, applies the hard `preferUnwatched` filter, scores each candidate using `genreScore + runtimeBonus`, and returns a ranked array. Runtime thresholds and the bonus value live as named constants in a shared config.

### Acceptance criteria

- [ ] `GET /api/discs/candidates` returns only discs where runtime > 0 AND genres is non-empty
- [ ] Each candidate in the response includes all Phase 4-ready fields: tmdbId, title, year, posterUrl, genres, runtime, directors, watched, watchCount, lastWatchedAt, rating
- [ ] `scoreCandidates()` returns candidates sorted by score descending
- [ ] `scoreCandidates()` accumulates genre weights correctly across multiple matching genres
- [ ] `scoreCandidates()` applies `runtimeBonus` only when disc runtime fits `runtimePreference`
- [ ] Runtime threshold constants are correct: short < 100 min, long ≥ 150 min
- [ ] Edge cases pass: 99 min scores as short, 100 min does not; 150 min scores as long, 149 min does not
- [ ] When `preferUnwatched: true`, watched discs are excluded before scoring — not penalised
- [ ] When `preferUnwatched: true` and zero unwatched candidates exist, returns empty array
- [ ] When fewer than 4 candidates exist, returns all available without error
- [ ] Unit tests cover all scoring behaviours and threshold edge cases

---

## Phase 2: Full pipeline, synchronous response

**User stories:** 1 (select tags), 2 (free text input), 3 (single clear recommendation), 4 (poster/title/year on card), 7 (up to 3 runners), 8 (runners appear immediately), 14 (empty state when no matches), 15 (deterministic result even if AI fails), 19 (recommendations from owned collection)

### What to build

The `POST /api/mood` endpoint wired end-to-end, returning a plain JSON response (not yet streamed). The server receives a MoodInput, calls Gemini with structured output to extract MoodAttributes, fetches the candidate pool, applies the hard `preferUnwatched` filter, scores candidates, and returns the top pick and up to 3 runners. The `ai/prompts/` and `ai/pipelines/` module patterns are established here — every future AI feature will follow the same structure. If Gemini call 1 fails, the endpoint returns HTTP 500. If zero candidates remain after filtering, the endpoint returns a distinct empty response. Tests mock Gemini at the SDK boundary.

### Acceptance criteria

- [ ] `POST /api/mood` accepts `{ tags: MoodTag[], freeText: string }` and returns `{ topPick: MoodCandidate, runners: MoodCandidate[] }`
- [ ] MoodAttributes are extracted via Gemini structured output — response is valid without manual JSON parsing
- [ ] `preferUnwatched: true` in MoodAttributes excludes watched candidates before scoring
- [ ] topPick is the highest-scored candidate; runners are the next up to 3 in order
- [ ] If zero candidates remain after filtering, endpoint returns a distinct empty response (not an error)
- [ ] If Gemini call 1 fails, endpoint returns HTTP 500
- [ ] Pipeline tests pass with Gemini mocked: correct call order, correct data passed, correct response shape
- [ ] Prompt functions are typed — no inline strings, no `any` types
- [ ] **Note:** the synchronous JSON response is a tracer bullet only — Phase 3 upgrades this endpoint to NDJSON streaming. This issue is not a finished deliverable.

---

## Phase 3: Streamed explanation + NDJSON

**User stories:** 5 (AI explanation referencing mood), 6 (explanation streams progressively), 14 (empty state message), 15 (deterministic result survives explanation failure)

### What to build

Upgrade `POST /api/mood` from synchronous JSON to a streaming NDJSON response. The result frame (topPick + runners) is emitted first so the client can render immediately. Gemini call 2 then streams the explanation as individual token frames. The endpoint closes with a `done` frame on success, an `empty` frame when no candidates match, or an `error` frame if the explanation call fails — without discarding the already-sent result frame. The explanation prompt instructs Gemini to write 2–3 sentences in a conversational tone, referencing the user's original mood input.

### Acceptance criteria

- [ ] `POST /api/mood` response is chunked transfer encoding with `Content-Type: application/x-ndjson`
- [ ] First NDJSON frame is `{"type":"result","topPick":{...},"runners":[...]}` — emitted before explanation begins
- [ ] Subsequent frames are `{"type":"token","text":"..."}` — one per explanation token
- [ ] Final frame on success is `{"type":"done"}`
- [ ] When zero candidates exist, a single `{"type":"empty"}` frame is emitted
- [ ] When Gemini call 2 fails, the result frame is already sent; an `{"type":"error","message":"..."}` frame follows without discarding the result
- [ ] When Gemini call 1 fails, endpoint returns HTTP 500 (stream never opens)
- [ ] Explanation references the original mood input (tags + free text) and names the film
- [ ] Pipeline tests with mocked Gemini verify all frame sequences including error paths

---

## Phase 4: IonTabs migration

**User stories:** 16 (Watch tab in nav), 17 (distinct from Collection)

**Prerequisite for:** Phase 5

### What to build

Migrate App.tsx from a bare `IonRouterOutlet` to `IonTabs`. The Collection page moves from `/` to `/collection`. The tab bar shell is added with two tabs — Collection and Watch — but the Watch tab routes to a placeholder page for now. All existing collection routes and navigation (disc detail, add disc modal) continue to work without regression. This is a structural refactor only; no mood engine UI is built here.

### Acceptance criteria

- [ ] App.tsx uses IonTabs with IonTabBar containing Collection and Watch tabs
- [ ] Collection page is accessible at `/collection`; the root `/` redirects to `/collection`
- [ ] Disc detail page (`/disc/:id`) continues to work from within the Collection tab
- [ ] Watch tab navigates to `/watch` (placeholder page is sufficient — "Coming soon" or empty)
- [ ] Tab bar is visible on both the Collection and Watch pages
- [ ] No existing collection functionality is broken by the route change

---

## Phase 5: Watch tab + mood UI

**User stories:** 1 (select tags), 2 (free text input), 3 (single recommendation), 4 (poster/title/year), 5 (streamed explanation), 6 (progressive streaming), 7 (runners), 8 (runners appear immediately), 9 (Try again), 16 (Watch tab in nav), 17 (distinct from Collection), 18 (Comfort Rewatch tag), 20 (mobile portrait)

**Depends on:** Phase 4 (IonTabs migration), Phase 3 (NDJSON stream endpoint)

### What to build

Replace the Watch tab placeholder with the complete mood UI. The Watch page has two states — idle and result. In idle state, the user sees the MoodInput component: a row of 8 tappable MoodTags and an optional free text field. On submit, the client calls `POST /api/mood` and transitions to the result state. A `useMoodStream` hook owns the fetch and TextDecoder loop, parsing NDJSON frames and exposing typed state (topPick, runners, explanation tokens, loading, empty, error). The MoodResult component renders the topPick poster card immediately on the result frame, streams the explanation token by token, and shows up to 3 runner cards below. A "Try again" button resets to idle.

### Acceptance criteria

- [ ] WatchPage renders idle state on first load: 8 MoodTag buttons + optional free text input
- [ ] Tags are multi-select; at least one tag or non-empty free text is required to submit
- [ ] On submit, page transitions to result state; idle form is no longer visible
- [ ] topPick poster, title, and year appear as soon as the result frame arrives (before explanation completes)
- [ ] Explanation text streams in progressively, token by token
- [ ] Up to 3 runner cards appear alongside the topPick (also from the result frame — no waiting)
- [ ] "Try again" button returns to idle state and clears all result state
- [ ] When zero candidates match, a user-friendly empty message is shown (not an error screen)
- [ ] When explanation fails but result frame was received, topPick and runners are still shown
- [ ] Layout is usable on mobile in portrait orientation
- [ ] `useMoodStream` unit tests cover: result frame parsing, token accumulation, empty frame, error frame, partial buffer handling
