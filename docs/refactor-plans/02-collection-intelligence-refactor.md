# 02 — Collection Intelligence Refactor

## Problem Statement

The collection-intelligence feature was built slice-by-slice under build
pressure. The code is functional and fully tested, but three areas have
accumulated polish debt:

1. **Visual polish** — `CollectionSummary` renders the summary bar as a row
   of adjacent text blocks with no visual separators between stats. The CSS
   uses `gap: 16px` for spacing but items still read as a single unpunctuated
   string (e.g. "4 discs3 unwatched (25%)5h 50m4"). The design intent (from
   the design log) shows dot-separated items: `47 discs · 12 unwatched · 34%`.

2. **Component logic** — `CollectionSummary` directly filters directors
   (`discCount >= 2`) and caps genres (`slice(0, 5)`) inside the component
   body. CLAUDE.md requires tests for all `src/lib/` functions; keeping this
   logic in the renderer means it goes untested, and leaves a future reader
   wondering why filtering decisions live in a rendering component.

3. **useCollection double-fetch** — `refreshToken` is initialised with
   `useState(0)`, but `setRefreshToken(version)` fires immediately on mount
   when `fetchDiscs` runs with `version = 1`. This causes `useStats` to
   fetch `/api/stats` twice on initial mount: once for token `0` (immediately
   cancelled by the cleanup) and once for token `1`. Functionally harmless
   but wasteful, and will be amplified once the AI decision pipeline also
   calls `/api/stats` on each refresh cycle.

## Solution

Three independent, sequenced changes:

1. Fix the `useState(0)` → `useState(1)` initialisation in `useCollection`
   so `setRefreshToken(1)` on first mount is a React no-op. One-line change;
   all existing tests continue to pass without modification.

2. Extract the two display-preparation functions from `CollectionSummary`
   into a new `src/lib/statsHelpers.ts` module with full test coverage.
   Update `CollectionSummary` to call the helpers. Component becomes a thin
   renderer with no filtering or capping logic.

3. Add CSS separator pseudo-elements to `.summary-bar` so items are visually
   separated by `·` without touching JSX. Add section labels for the director
   and genre breakdowns. No HTML changes.

## Commits

### Commit 1 — Fix useCollection double-fetch on mount

Change `useState(0)` to `useState(1)` for `refreshToken` in `useCollection`.

The version counter (`fetchVersion`) is a `useRef(0)` that increments to 1
on the first `fetchDiscs` call. Initialising `refreshToken` at 1 means the
initial `setRefreshToken(1)` call is a React bail-out (same value), so
`useStats` fires its effect exactly once on mount rather than twice.

No test changes required. After `loading` settles to `false`, `tokenBefore`
equals 1 in both the old and new code; the increment test continues to pass.

### Commit 2 — Add statsHelpers.ts with filterQualifiedDirectors and capGenres

Create `src/lib/statsHelpers.ts` with two exported pure functions:

- `filterQualifiedDirectors(directors: DirectorStat[]): DirectorStat[]`
  Returns only directors whose `discCount` is 2 or greater. The threshold
  of 2 is a domain constant (UI-only filter; the API returns all directors).

- `capGenres(genres: GenreStat[]): GenreStat[]`
  Returns the first 5 genres. The cap of 5 is a hardcoded UI constant
  matching the current `slice(0, 5)` in `CollectionSummary`.

Both functions are pure (no side effects, no I/O). Tests live in
`src/lib/__tests__/statsHelpers.test.ts`, following the same pattern as
`formatRuntime.test.ts`.

### Commit 3 — Refactor CollectionSummary to use statsHelpers

Replace the inline filter and slice in `CollectionSummary` with calls to
`filterQualifiedDirectors` and `capGenres`. The component body shrinks by
two variable declarations; behaviour is identical. No test changes to
`CollectionSummary.test.tsx` — tests verify rendered output, not the
helpers, so they are unaffected by where the logic lives.

### Commit 4 — Polish CollectionSummary CSS

Update `CollectionSummary.css`:

- Add `::after { content: " ·"; }` on `.summary-bar span` with
  `:last-child { content: none; }` to insert dot separators between summary
  items without touching JSX.
- Add section label styles for `.director-breakdown` and `.genre-breakdown`
  headings (font weight, spacing, colour) to visually distinguish the two
  breakdowns from the summary bar and from each other.
- Adjust `.director-row` and `.genre-row` spacing for legibility.

No JSX changes. No test changes — CSS is not covered by unit tests.

## Decision Document

### Modules affected

- `src/hooks/useCollection.ts` — one-line `useState` initialisation change
- `src/lib/statsHelpers.ts` — new module
- `src/lib/__tests__/statsHelpers.test.ts` — new test file
- `src/components/CollectionSummary.tsx` — call helpers instead of inline logic
- `src/components/CollectionSummary.css` — separator pseudo-elements and section labels

### Modules not affected

- `server/` — no changes. API contract unchanged.
- `src/types/stats.ts` — no changes. Type shapes unchanged.
- `src/hooks/useStats.ts` — no changes.
- `src/hooks/__tests__/useStats.test.ts` — no changes.
- `src/hooks/__tests__/useCollection.test.ts` — no changes.
- `src/components/__tests__/CollectionSummary.test.tsx` — no changes.

### Interface decisions

`filterQualifiedDirectors` and `capGenres` are not parameterised. The
threshold (2) and cap (5) are domain constants for this UI context. Accepting
them as parameters would add flexibility that has no current use case and
contradicts CLAUDE.md's guidance against designing for hypothetical future
requirements.

### useCollection initialisation

`refreshToken` and `fetchVersion` must stay in sync. `fetchVersion` is a ref
that starts at 0 and increments to 1 on the first fetch. `refreshToken` is
initialised at 1 so the first `setRefreshToken(1)` call is a React no-op.
This relationship is fragile if the starting value of `fetchVersion` ever
changes — a comment in the code should document the coupling.

### CSS separator approach

Pseudo-elements are preferred over explicit separator spans. Separators are
purely presentational; they do not belong in the accessibility tree and add
noise to the component markup. CSS `::after` with `content: " ·"` and a
`:last-child` override achieves the same result with zero JSX change.

## Testing Decisions

### What makes a good test here

Tests should verify observable outputs given known inputs. For the helpers,
that means: given a list of directors or genres, the correct filtered/capped
list is returned. Tests must not assert on internal implementation (the
threshold value must not be tested by passing threshold as argument — it is
baked in).

### Modules to test

- `src/lib/statsHelpers.ts` — new tests required (CLAUDE.md rule: every
  `src/lib/` function must have a test)
- `src/hooks/useCollection.ts` — no new tests; existing tests cover the
  behaviour and will continue to pass after the `useState` change
- `src/components/CollectionSummary.tsx` — no new tests; existing tests
  verify rendered output and are unaffected by whether the logic is inline
  or delegated to helpers

### Prior art

`src/lib/__tests__/formatRuntime.test.ts` — same pattern: pure function,
describe block, one `it` per case, no mocking.

## Out of Scope

- API contract changes (`/api/stats` payload shape unchanged)
- Schema changes
- New features (TMDB filmography comparison, stats caching, dedicated stats page)
- UI polish beyond the summary section (disc grid cards, detail page styling — deferred in dev-journal)
- Camera scanning
- Any changes to server-side aggregation logic

## Further Notes

The `statsHelpers.ts` extraction sets a precedent: any future display-prep
logic for stats (e.g. formatting watchedPercent as a progress bar width,
bucketing runtime into "short / medium / long") should live in `statsHelpers`
rather than in the component. The module name signals intent.

The CSS change in Commit 4 intentionally comes last. It is independent of the
logic changes and can be reviewed or reverted without affecting functionality.
