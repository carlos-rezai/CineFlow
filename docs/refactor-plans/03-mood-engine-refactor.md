# 03 — Mood Engine Refactor

## Problem Statement

The mood engine was built across four issues and is functionally complete,
but has accumulated three categories of debt:

1. **Functional bug** — both Gemini prompt files reference `gemini-2.0-flash`,
   which is deprecated for new users and returns a 404. The mood engine does
   not work at all for any new deployment. This is the highest priority item.

2. **UI visual debt** — the Watch page was never visually tested. Mood tags
   render with no spacing or chip styling. The free text input has a dark
   background inconsistent with the page. The submit button overlaps the
   input. There is unexplained whitespace below the form. The result state
   (poster, explanation, runners) was stubbed out but never properly laid
   out — runners show title and year only, with no poster thumbnail despite
   `posterUrl` being available in `MoodCandidate`.

3. **Structural drift from design log** — several modules specified in the
   design log were never created. Types are scattered rather than centralised:
   `MoodCandidate` and `MoodAttributes` are defined in `server/src/lib/scoreCandidates.ts`
   and then re-defined inline in `src/hooks/useMoodStream.ts`. The runtime
   scoring constants (`SHORT_RUNTIME_THRESHOLD`, `LONG_RUNTIME_MIN`,
   `RUNTIME_BONUS`) live in `scoreCandidates.ts` rather than the intended
   `ai/config.ts`. `MoodInput.tsx` and `MoodResult.tsx` were never extracted —
   all UI logic is inlined in `WatchPage.tsx` alongside a `TopPickCard`
   subcomponent. The error state (`status === 'error'`) is handled in the hook
   but never rendered in the page.

## Solution

Address the three categories in priority order, with the smallest possible
commits so the codebase remains working at every step.

1. Fix the functional bug immediately so the feature is usable.
2. Centralise types and constants to eliminate duplication and match the
   design log structure.
3. Extract UI components and add the missing error state.
4. Apply Ionic styling throughout so the page looks correct.

## Commits

**Commit 1 — fix: restore correct mood tag set and update Gemini model to gemini-2.5-flash**

Change `gemini-2.0-flash` to `gemini-2.5-flash` in `extractMoodAttributes.ts`
and `streamMoodExplanation.ts`. Update the model reference in `CLAUDE.md` to
match.

Restore the `MOOD_TAGS` constant in `WatchPage.tsx` to the locked set of 8
specified in the design log: `Intense`, `Chill`, `Dark`, `Uplifting`,
`Quick Watch`, `Epic Night`, `Comfort Rewatch`, `Something New`. The current
implementation has drifted to a different set (`Cozy`, `Intense`, `Quick Watch`,
`Epic`, `Dark`, `Mind-Bending`, `Comfort Rewatch`, `Family Night`) — notably
missing `Something New`, the only tag specifically designed to signal
`preferUnwatched: true` to Gemini. Without it, users have no fast path to
filter for unwatched films only.

The count stays at 8 so the `renders 8 MoodTag buttons` test passes unchanged.
Verify the app responds after this change.

---

**Commit 2 — refactor: create ai/types/mood.ts and centralise server/AI mood types**

Create `ai/types/mood.ts` containing `MoodInput`, `MoodAttributes`, and
`MoodCandidate`. These are the types shared between the AI prompt layer and
the server scoring layer. `MoodInput` moves from `extractMoodAttributes.ts`
(where it was a local interface) to this shared file.

Update `scoreCandidates.ts` to import `MoodAttributes` and `MoodCandidate`
from `ai/types/mood.ts` instead of defining them locally. The runtime
constants and the pure functions stay in `scoreCandidates.ts` for now.

Update `extractMoodAttributes.ts` and `streamMoodExplanation.ts` to import
their types from `ai/types/mood.ts` instead of from `scoreCandidates.ts`.
This removes the cross-boundary import from `ai/` into `server/src/lib/`.

All existing tests pass after this commit with no changes.

---

**Commit 3 — refactor: create ai/config.ts with runtime constants**

Create `ai/config.ts` with the three constants: `RUNTIME_SHORT_MAX = 100`,
`RUNTIME_LONG_MIN = 150`, `RUNTIME_BONUS = 0.5`. These match the names and
values specified in the design log.

Update `scoreCandidates.ts` to import the constants from `ai/config.ts` and
remove the local declarations. The inline prompt text in
`extractMoodAttributes.ts` already references "under 100 min" and "150 min
or more" — leave those as prose (they are human-readable descriptions in a
prompt, not programmatic references).

All existing tests pass after this commit with no changes.

---

**Commit 4 — refactor: create src/types/mood.ts and centralise client mood types**

Create `src/types/mood.ts` containing `MoodCandidate`, `MoodInput`,
`MoodStatus`, the `MoodFrame` union (`MoodResultFrame`, `MoodTokenFrame`,
`MoodDoneFrame`, `MoodEmptyFrame`, `MoodErrorFrame`), and `UseMoodStreamResult`.

Add a comment above `MoodCandidate` noting that it intentionally duplicates
the server-side definition in `ai/types/mood.ts`. These are separate compile
targets; the duplication is deliberate and expected to diverge as the feature
evolves (same pattern as `TmdbCandidate`).

Update `useMoodStream.ts` to import all types from `src/types/mood.ts` and
remove the inline type definitions. Update `WatchPage.tsx` to import
`MoodCandidate` from `src/types/mood.ts` instead of from the hook.

All existing tests pass after this commit with no changes.

---

**Commit 5 — refactor: extract MoodInput component with IonChip tags and IonButton submit**

Create `src/components/MoodInput.tsx`. This component owns the tag picker and
the free text input. Props: `selectedTags: string[]`, `onToggleTag: (tag: string) => void`,
`freeText: string`, `onFreeTextChange: (value: string) => void`,
`onSubmit: () => void`, `canSubmit: boolean`, `disabled: boolean`.

Mood tags use `IonChip` with `data-testid="mood-tag"` and `aria-pressed` to
preserve the existing test contract. The free text input remains a native
`<input>` (not `IonInput`) to keep it testable with `fireEvent.change`. The
submit button uses `IonButton` with `data-testid="mood-submit"`.

Update `WatchPage.tsx` to render `<MoodInput />` instead of the inline form.
All state and handlers stay in `WatchPage.tsx`; `MoodInput` is purely
presentational.

Existing `WatchPage.test.tsx` passes without changes — all `data-testid`
attributes and `aria-pressed` behaviour are preserved.

---

**Commit 6 — refactor: extract MoodResult component with poster thumbnails for runners**

Create `src/components/MoodResult.tsx`. This component owns the top pick
display and the runner list. Props: `topPick: MoodCandidate`,
`runners: MoodCandidate[]`, `explanation: string`, `onReset: () => void`.

The top pick shows the poster image, title, year, and the streamed
explanation. Runner cards show a poster thumbnail, title, and year, with
`data-testid="runner-card"` on each card to preserve the test contract.
The `TopPickCard` subcomponent moves from `WatchPage.tsx` into `MoodResult.tsx`
and is no longer exported.

Update `WatchPage.tsx` to render `<MoodResult />` instead of the inline
result block.

Existing `WatchPage.test.tsx` passes without changes — `data-testid="runner-card"`
is preserved, and result state assertions remain the same.

---

**Commit 7 — fix: add error state rendering and test to WatchPage**

Add a test to `WatchPage.test.tsx` covering the error state: when `status === 'error'`,
the page shows an error message and a "Try again" button that calls `reset()`.
Use an `errorHook` helper consistent with the existing `emptyHook` pattern.

Add the error state block to `WatchPage.tsx`: a `data-testid="mood-error"`
wrapper with a message ("Something went wrong") and a "Try again" button that
calls `reset()`. This matches the empty state pattern exactly.

---

**Commit 8 — refactor: WatchPage page-level layout and input styling**

Apply `IonContent` padding and structural layout to `WatchPage.tsx` so the
idle and result sections are correctly spaced within the page. This commit
addresses the whitespace below the form and any remaining layout issues at
the page level that are not owned by `MoodInput` or `MoodResult` themselves.

Style the native free text input to match the Ionic page background and
remove the dark background mismatch.

No behaviour changes. No test changes.

## Decision Document

**Type centralisation approach**

`MoodCandidate` will exist in two files: `ai/types/mood.ts` (server/AI side)
and `src/types/mood.ts` (client side). This is deliberate. The two compile
targets cannot share modules at runtime, and a shared types package is not
justified at this scale. The duplication is documented with a comment. Same
pattern established for `TmdbCandidate`.

**Mood tag set**

The `MOOD_TAGS` constant is restored to the design log's locked set of 8 in
commit 1: `Intense`, `Chill`, `Dark`, `Uplifting`, `Quick Watch`, `Epic Night`,
`Comfort Rewatch`, `Something New`. The implementation had drifted; `Something New`
is functionally significant because it is the designed signal for `preferUnwatched: true`.

`MoodTag` will not be introduced as a union type. The hook and submission
use `string[]` and locking the tags as a union type adds friction without
clear value at this stage.

**IonChip for mood tags**

`IonChip` with `data-testid="mood-tag"` and `aria-pressed` attribute. The
existing tests find tags by testid and assert `aria-pressed` — both attributes
work on custom elements in jsdom. `fireEvent.click` fires on the element
directly. No test changes required.

**Native input preserved**

The free text input remains a native `<input>` (not `IonInput`). Established
project pattern: `IonInput` does not fire standard DOM `change` events in
jsdom and breaks `fireEvent.change` tests. The native input is styled to match
the Ionic page.

**IonButton for submit**

`IonButton` with `data-testid="mood-submit"` and `disabled` prop. The existing
`toBeDisabled()` assertion works against the custom element's `disabled`
attribute. `fireEvent.click` on the `<ion-button>` element triggers the
attached `onClick` handler.

**Component extraction scope**

`MoodInput` and `MoodResult` are purely presentational. All state and hook
calls stay in `WatchPage.tsx`. The components receive props and emit callbacks.
This matches the existing pattern in collection components.

**TopPickCard**

Moves from being an inline exported-adjacent component in `WatchPage.tsx` into
`MoodResult.tsx` as a private internal component. No longer exported.

**Gemini model**

`gemini-2.5-flash` in both prompt files. No other Gemini configuration changes.

**CLAUDE.md update**

The model reference in `CLAUDE.md` is updated in the same commit as the
prompt files. The update reads: `gemini-2.5-flash`.

## Testing Decisions

**What makes a good test here**

Tests cover external behaviour observable from the outside: what the page
renders given a hook state, and what callbacks fire in response to user
actions. Tests do not assert on CSS classes, internal component structure,
or implementation details of how components are composed.

**Modules tested**

- `WatchPage.test.tsx` covers the full page behaviour for all states: idle,
  loading, result, empty, and error. This file gains one new describe block
  for the error state in commit 7. All existing tests pass unchanged through
  every commit.
- No new test files for `MoodInput.tsx` or `MoodResult.tsx`. The page-level
  tests already exercise their rendered output and callbacks indirectly.

**Prior art**

`WatchPage.test.tsx` mocks `useMoodStream` at the module boundary and tests
each UI state by controlling the mock return value. The error state test
follows the identical pattern used by the existing empty state tests. The
`errorHook` helper follows the same shape as `emptyHook`.

## Out of Scope

- No schema changes or API contract changes.
- No new features or new AI calls.
- No changes to `moodPipeline.ts`, `candidateService.ts`, `discService.ts`,
  or `useMoodStream.ts` logic beyond type imports.
- No new test files. Only `WatchPage.test.tsx` gains new tests.
- Camera scanning, caching mood results, multiple top picks — all deferred
  per design log.
- Relaxing `preferUnwatched` filter — out of scope as specified in design log.
- `MoodTag` union type — not introduced (see decision document).
- Director/tone keyword attributes — Phase 4 concern.

## Further Notes

The functional bug (commit 1) should be verified against a live Gemini API
call before proceeding to structural work. If `gemini-2.5-flash` also returns
an error, investigate the API key and account status before filing this plan.

Commits 2–4 are pure type reorganisation with no runtime behaviour changes.
All existing tests should remain green after each of these commits with zero
test file modifications.

The commit order within each category (types, then components, then error
state, then layout) is intentional: each step leaves the application in a
working state and does not depend on later commits.
