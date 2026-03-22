# Refactor Plan: Collection Core

> Filed as GitHub issue: see link below after filing

## Problem Statement

The collection-core build was done under TDD pressure and left several
categories of technical debt:

1. **Raw `fetch` calls scattered across three hooks** — no shared API
   layer, inconsistent error handling, silent `!res.ok` failures in
   `useCollection` and `useAddDisc`, and duplicated `setLoading →
fetch → json() as Type → setState` boilerplate.

2. **Business logic living in components** — `AddDiscModal` owns search
   state that belongs in `useAddDisc`; `DiscDetailPage` owns notes
   hydration logic that belongs in `useDisc`. Components should only
   render and handle user interaction.

3. **40+ inline style props** across `DiscDetailPage` and `AddDiscModal`
   — no design tokens, nothing reusable, inconsistent spacing, and
   styles that belong in CSS living in JSX.

---

## Solution

Three sequential phases, each leaving the app fully working:

1. Extract a typed `src/lib/api.ts` fetch wrapper and migrate all three
   hooks to use it. Fixes all `res.ok` gaps in one place.

2. Move search state into `useAddDisc` and notes hydration into
   `useDisc`. Both hooks own their full state machines; components
   become thin renderers.

3. Replace inline styles with Ionic CSS utilities and per-component
   CSS files.

---

## Commits

### Phase 1 — API layer

**Commit 1: Create `src/lib/api.ts` with typed fetch wrapper**

Create the module with an `ApiError` class (carries `status: number`)
and four exported functions: `apiGet`, `apiPost`, `apiPatch`,
`apiDelete`. All four build the full URL from `API_BASE`, check
`res.ok`, and throw `ApiError` on failure. `apiGet`, `apiPost`, and
`apiPatch` parse and return typed JSON. `apiDelete` returns `void`
and does not attempt to parse the 204 response body. No existing code
changes in this commit — this is purely additive.

Write tests in `src/lib/__tests__/api.test.ts` covering: successful
GET returns parsed data; non-ok GET throws `ApiError` with the correct
HTTP status; POST sends the correct method, Content-Type header, and
serialised body; PATCH does the same; DELETE resolves on 204; DELETE
throws `ApiError` on non-ok. Tests stub global `fetch`.

**Commit 2: Migrate `useCollection` to `api.ts`**

Replace the raw `fetch` call in `fetchDiscs` with `apiGet`. Wrap in
try/catch so a network or server error sets `loading: false` without
crashing. This commit fixes the silent failure bug where a non-ok
response was parsed as if it were valid data. Existing tests pass
without modification.

**Commit 3: Migrate `useDisc` to `api.ts`**

Replace the five raw `fetch` calls (initial load, toggle watched,
set rating, save notes, delete) with `apiGet`, `apiPatch`, and
`apiDelete`. Replace all `if (!res.ok)` guards with `try/catch`.
The optimistic-revert paths (`setDisc(prev); showToast(...)`) move
into catch blocks. The `deleteDisc` function catches and sets
`deleteError` instead of checking `res.ok` inline.

Existing `useDisc` tests already mock `fetch` returning `{ ok: false
}` for failure cases — these continue to work because `api.ts` checks
`ok` before returning and throws, which the try/catch catches.

**Commit 4: Migrate `useAddDisc` to `api.ts`**

Replace the four raw `fetch` calls (UPC lookup, TMDB search in
`onBarcodeDetected`, TMDB search in `searchTmdb`, POST to `/api/discs`)
with `apiGet` and `apiPost`. For the 409 duplicate case, catch
`ApiError` and check `err.status === 409` to set `isDuplicate`.
Any other thrown `ApiError` sets `errorMessage`.

The existing `useAddDisc` tests stub `fetch` responses without `ok:
true` on the UPC and TMDB mocks (lines 38 and 41). Add `ok: true`
to those mock responses as part of this commit.

---

### Phase 2 — Hook state ownership

**Commit 5: Move search state into `useAddDisc`**

Add to `useAddDisc`'s state: `searchQuery` (string), `searchResults`
(TmdbCandidate[]), `isSearching` (boolean). Add two new methods:
`setSearchQuery(query: string)` and `search()`. `search()` is a
no-arg method that reads `searchQuery` from state, guards on empty
string, sets `isSearching`, calls `apiGet` for TMDB search, sets
`searchResults`, and clears `isSearching`. Remove `searchTmdb` from
the returned interface — it becomes an internal helper. The
`reset()` function clears search state alongside existing state.

In `AddDiscModal`, remove the three local state declarations
(`searchQuery`, `searchResults`, `isSearching`) and the
`handleSearch` function. Wire the search input to the hook's
`searchQuery` / `setSearchQuery`, the Search button to `search()`,
and the results list to `searchResults`. Component rendering is
otherwise unchanged.

Add tests to `useAddDisc.test.ts`:

- `setSearchQuery` updates `searchQuery`
- Calling `search()` with a non-empty query fetches TMDB and
  populates `searchResults`
- Calling `search()` with an empty query does not fetch
- A failed TMDB search leaves `searchResults` empty
- `reset()` clears `searchResults` and `searchQuery`

**Commit 6: Move notes hydration into `useDisc`**

Add `localNotes: string` and `setLocalNotes: (v: string) => void`
to `UseDiscResult`. Inside the hook, initialise `localNotes` from
`disc.notes` when the disc first loads (same logic as the current
`notesReady` pattern, but owned by the hook). Change `saveNotes` to
take no arguments — it reads `localNotes` via a ref to avoid stale
closure, and updates `localNotes` state on success.

In `DiscDetailPage`, remove `localNotes`, `setLocalNotes`,
`notesReady`, and `setNotesReady` state. Read `localNotes` and
`setLocalNotes` from `useDisc`. Change the `onBlur` handler from
`saveNotes(localNotes)` to `saveNotes()`.

Update `useDisc` tests:

- The `saveNotes` success test now calls `setLocalNotes('...')` then
  `saveNotes()` instead of `saveNotes('...')`
- Add a test: `localNotes` is populated from `disc.notes` after the
  initial fetch resolves
- Add a test: `setLocalNotes` updates `localNotes` in the hook

---

### Phase 3 — Styling

**Commit 7: Replace inline styles in `DiscDetailPage`**

Create `src/pages/DiscDetailPage.css`. Move all inline style props
from `DiscDetailPage.tsx` into named CSS classes. Use Ionic CSS
utilities (`ion-padding`, `ion-text-center`, `ion-margin-*`) wherever
they cover the intent exactly; write explicit classes for anything
not covered. The `StarRating` sub-component's button styles move into
`.star-rating` and `.star-rating__button` classes. No visual changes.

**Commit 8: Replace inline styles in `AddDiscModal`**

Create `src/components/AddDiscModal.css`. Move all inline styles out
of `AddDiscModal.tsx`. The two near-identical input block styles
(barcode input and search input) become a single `.text-input` class
used by both. No visual changes.

---

### Phase 4 — Documentation

**Commit 9: Document intentional `TmdbCandidate` type duplication**

Add a comment to both `src/types/tmdb.ts` and
`server/src/types/index.ts` explaining that `TmdbCandidate` is
intentionally duplicated rather than shared — the frontend and backend
type the same TMDB search shape independently so they can diverge
freely as features evolve without introducing a shared-types build
dependency.

---

## Decision Document

- **`src/lib/api.ts`** is a pure, synchronous-interface module in the
  established `src/lib/` boundary. No business logic — only HTTP
  mechanics.
- **`ApiError`** carries `status: number` so callers can distinguish
  409 (duplicate) from 5xx without inspecting response bodies.
- **`apiDelete` does not parse JSON** — the DELETE endpoint returns
  204 No Content and calling `.json()` on it would throw.
- **All hooks use try/catch** after migration, not `if (!res.ok)`.
  This is consistent with how thrown errors propagate through async
  call chains.
- **`saveNotes` becomes a no-arg method** after the notes hydration
  move — the hook owns `localNotes` and reads it internally via ref
  to avoid stale closure, same pattern as `barcodeRef` in `useAddDisc`.
- **`searchTmdb` is removed from `useAddDisc`'s public interface**
  after commit 5. It was only exposed so the component could call it;
  with search state inside the hook, the component has no need for it.
- **CSS modules not used** — the current codebase scale doesn't
  justify the tooling overhead. Per-component CSS files imported
  directly are sufficient.
- **`TmdbCandidate` duplication is intentional** — a shared types
  package between frontend and backend would require a monorepo build
  step that is not justified at this stage. The types are identical now
  but will diverge as features evolve.

---

## Testing Decisions

Good tests verify observable behavior through the public interface of
a module, not implementation details. A refactoring that changes
internals but not behavior should not require test rewrites.

**`src/lib/__tests__/api.test.ts`** (new)
Tests for `api.ts` are integration-style: stub global `fetch`,
call the function, verify return value or thrown error. Verify that
POST/PATCH send the correct HTTP method, `Content-Type` header, and
serialised body — these are part of the public contract since callers
depend on them reaching the server correctly.

**`src/hooks/__tests__/useAddDisc.test.ts`** (updated)
Two kinds of changes: (a) add `ok: true` to fetch mocks that were
missing it — these were always conceptually correct but the raw-fetch
path didn't enforce it; (b) add new tests for search state after
commit 5. New tests use `setSearchQuery` + `search()` through the
hook's public interface. The test for `onBarcodeDetected` is
unchanged in structure.

**`src/hooks/__tests__/useDisc.test.ts`** (updated)
Update the `saveNotes` test to use the new no-arg signature. Add two
new tests for `localNotes` initial hydration and `setLocalNotes`.
Existing optimistic-update and revert-on-failure tests are unchanged
in structure.

No tests are needed for CSS changes.

---

## Out of Scope

- **Camera/BarcodeDetector scanning** — has its own grill-me cycle
  planned. The 60-line scanning effect in `AddDiscModal` is left as-is.
- **`aria-hidden` Ionic warning** — known upstream Ionic v8 + React 19
  bug. Cannot be fixed from application code without a workaround that
  would need to be reverted when Ionic releases a fix. Leave unfixed.
- **Shared `TmdbCandidate` types package** — not justified at this
  scale. Duplication is intentional and documented.
- **Server-side refactoring** — route validation gaps (`req.body as
CreateDiscBody` without runtime checks) and `findOneAndUpdate` cast
  assumptions are real issues but belong in a separate server-focused
  refactor. Not in scope here.
- **Backend type changes** — no schema or API contract changes in
  this refactor.

---

## Further Notes

- The `CollectionRefreshContext` ref-mutation pattern
  (`refreshRef.current = refresh` during render) is intentional and
  documented. It is not a bug. Do not move it to a `useEffect` —
  the async gap was the root cause of the stale-filter bug in issue #7.
- The `fetchVersion` counter in `useCollection` is also intentional —
  it prevents out-of-order fetch responses from overwriting fresh data.
  Do not remove it.
