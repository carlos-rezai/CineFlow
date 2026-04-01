# Plan: Decision Pipeline

> Source PRD: https://github.com/carlos-rezai/CineFlow/issues/21

## Architectural decisions

- **Route**: `POST /api/decision` — no request body; independent from `POST /api/mood`
- **Stream format**: NDJSON — same frame types as mood pipeline (`result`, `token`, `done`, `empty`, `error`)
- **Key models**: `MoodCandidate` reused without modification across scoring, route, hook, and UI
- **Scoring**: deterministic pure function — all signals derived from the full candidates array; no additional DB queries
- **AI**: Gemini 2.5 Flash — streams explanation only; does not select the top pick
- **UI**: mode toggle on Watch tab (`/watch`) — React state, default Mood, not persisted

---

## Phase 1: Tracer bullet — mode toggle + top pick (no explanation)

**User stories**: 1, 2, 3, 8, 9, 10, 11, 12, 14, 15, 16

### What to build

Build and fully test the scoring function first, before any route or UI work. The scoring function receives the full `MoodCandidate[]` array and derives all signals internally: recency penalty (last 3 watched), rating bonus, unwatched bonus, director completion boost, variety penalty, and `tmdbRating` as tiebreaker. It produces a top pick, up to 3 runners, a `reasons: string[]` array, and the `last3Watched` slice. It returns `null` only if the candidates array is empty.

Once the scoring function is fully tested, wire it end-to-end: `POST /api/decision` fetches candidates, runs the scorer, and streams a result frame followed by a done frame (no Gemini call yet). A `useDecisionStream` hook fetches the endpoint and parses the NDJSON stream. The Watch tab gains a mode toggle — "Mood" / "Decide for me" — that defaults to Mood. Switching to "Decide for me" auto-runs the hook and renders the top pick card. Mood mode rendering is unchanged.

### Acceptance criteria

- [ ] Scoring function returns the correct top pick for all signal combinations (recency, rating, unwatched, director completion, variety)
- [ ] Scoring function returns `null` for an empty candidates array
- [ ] Missing signal data (no rating, no `lastWatchedAt`) contributes zero without error
- [ ] Director completion boost applies at exactly ≥50%; does not apply below
- [ ] `tmdbRating` breaks ties when all other signals are equal
- [ ] `POST /api/decision` returns a valid result frame + done frame with no Gemini call
- [ ] `POST /api/decision` returns an empty frame when no candidates exist
- [ ] Mode toggle renders "Mood" by default on first load
- [ ] Switching to "Decide for me" auto-runs the pipeline and renders the top pick card
- [ ] Switching back to "Mood" restores the mood engine UI unchanged

---

## Phase 2: Streamed explanation

**User stories**: 4, 17, 18

### What to build

Add the Gemini layer. A typed prompt function receives the top pick metadata, `last3Watched` (title, rating, watchCount), and `reasons: string[]` as human-readable strings — never raw score floats. It streams a 2–3 sentence personalised explanation referencing the user's actual history. A pipeline orchestrator ties the scorer and the prompt together.

The route is updated to stream token frames between the result frame and the done frame. The hook accumulates tokens into the explanation string. The Watch tab renders the explanation as it streams, in the same position as the mood engine explanation. A pipeline or Gemini failure after the result frame is surfaced as an error frame; the hook exposes an error status.

### Acceptance criteria

- [ ] Explanation streams token-by-token after the result frame
- [ ] Explanation references at least one of the named scoring reasons
- [ ] Pipeline is unit-tested with Gemini mocked at the SDK boundary
- [ ] A Gemini failure after the result frame emits an error frame; hook transitions to error status
- [ ] Watch tab renders the streaming explanation beneath the top pick card
- [ ] Error state is displayed if the hook reaches error status

---

## Phase 3: Full UX — runners, "Pick again", edge states

**User stories**: 5, 6, 7, 13

### What to build

Complete the result UI and all edge states. The result frame already carries up to 3 runners; wire them into the `MoodResult` component display. Implement the cached-result behaviour: navigating away and returning to "Decide for me" mode shows the last result in React state with a "Pick again" button rather than auto-running again. "Pick again" triggers a fresh pipeline run. Add the empty state for zero candidates. Verify the error state from Phase 2 renders correctly across all failure points.

### Acceptance criteria

- [ ] Up to 3 runners are displayed alongside the top pick
- [ ] Navigating away and returning shows the cached result, not a fresh run
- [ ] "Pick again" button is visible on re-enter and triggers a fresh pipeline run
- [ ] Empty state is rendered when the endpoint returns an empty frame
- [ ] Error state is rendered when the hook reaches error status (covers Phase 2 path)
- [ ] Mode resets to Mood on page refresh (React state only — no persistence)
