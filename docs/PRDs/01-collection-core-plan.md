# Plan: Collection Core

> Source PRD: https://github.com/carlos-rezai/CineFlow/issues/1

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: `POST /api/discs`, `GET /api/discs`, `GET /api/discs?watched=`,
  `GET /api/discs/:id`, `PATCH /api/discs/:id`, `DELETE /api/discs/:id`,
  `GET /api/tmdb/search?q=`, `GET /api/upc/:barcode`
- **Schema**: Two MongoDB collections — `discs` and `tmdb_movies`. TMDBMovies
  are shared across Discs and never deleted. A Disc is never written until the
  user confirms a TmdbCandidate.
- **Key models**: `Disc` (barcode, format, addedAt, tmdbId, watched,
  lastWatchedAt, watchCount, rating, notes), `TMDBMovie` (tmdbId unique index,
  title, year, posterUrl, overview, runtime, genres, directors, cast,
  tmdbRating, cachedAt), `TmdbCandidate` (tmdbId, title, year, posterUrl —
  transient, never persisted)
- **Write semantics**: Add/delete/notes are server-confirmed. Watched toggle
  and rating are optimistic with revert-on-failure.
- **API keys**: Never leave the server. All TMDB and UPC calls are proxied.

---

## Phase 1: Data layer and bare API

**User stories**: Foundation — no directly user-facing stories. Enables all
subsequent phases.

### What to build

Stand up the MongoDB connection and implement the two service layers —
one for Disc CRUD (create, read-by-id, list with optional watched filter,
partial update, delete, duplicate-barcode check) and one for TMDBMovie CRUD
(upsert-by-tmdbId to avoid duplicating shared metadata). Wire all 7 routes
to these services with real MongoDB reads and writes. No UI changes. TMDB and
UPC external calls are not made yet — route handlers receive and return shaped
payloads but the proxy clients are stubs.

### Acceptance criteria

- [ ] A Disc can be created via `POST /api/discs` with a hardcoded JSON body
      (no barcode scan needed)
- [ ] `GET /api/discs` returns the created Disc
- [ ] `GET /api/discs?watched=false` returns only unwatched Discs
- [ ] `GET /api/discs/:id` returns a Disc joined with its TMDBMovie
- [ ] `PATCH /api/discs/:id` updates any subset of writable fields
- [ ] `DELETE /api/discs/:id` removes the Disc document; the TMDBMovie is
      unchanged
- [ ] Adding a second Disc with the same barcode returns a duplicate-warning
      payload rather than an error
- [ ] Adding two Discs that reference the same tmdbId results in one shared
      TMDBMovie document (upsert, not insert)
- [ ] All Disc service functions have tests against a real test database
- [ ] All TMDBMovie service functions have tests against a real test database

---

## Phase 2: External API proxies

**User stories**: Foundation — no directly user-facing stories. Enables the
add-disc flow in Phase 4.

### What to build

Implement the two external API client layers and connect them to their proxy
routes. The UPC client calls the third-party UPC API and shapes the response
to a title string or null. The TMDB client calls the TMDB search endpoint and
shapes the response to an array of TmdbCandidates. Both proxy routes return
only the curated fields — no raw third-party payloads reach the client. API
keys are read from environment variables and never forwarded.

### Acceptance criteria

- [ ] `GET /api/upc/:barcode` returns a title string for a known barcode
- [ ] `GET /api/upc/:barcode` returns null (not an error) for an unknown
      barcode
- [ ] `GET /api/tmdb/search?q=blade+runner` returns an array of
      TmdbCandidates shaped as `{ tmdbId, title, year, posterUrl }`
- [ ] No raw TMDB or UPC fields outside the curated shape reach the client
- [ ] UPC client has tests covering successful response and silent failure
- [ ] TMDB client has tests covering response shaping to TmdbCandidate array

---

## Phase 3: Collection grid

**User stories**: 10, 11, 12, 13

### What to build

Replace `CollectionPage.tsx` entirely. Fetch the disc list from
`GET /api/discs` (with optional watched filter), render it as a poster grid
sorted by `addedAt` descending. Each card shows the film poster; watched discs
get a subtle dark overlay with a checkmark. A watched/unwatched filter control
is visible on the page. Tapping a card navigates to `/disc/:id` (the detail
page route can be a stub at this stage — just the navigation matters). A FAB
is present but opens nothing yet.

### Acceptance criteria

- [ ] Collection grid renders Discs fetched from the live API
- [ ] Discs are ordered most-recently-added first
- [ ] Watched discs display a visual overlay distinguishing them from unwatched
- [ ] Filtering to "unwatched" shows only Discs where `watched` is false
- [ ] Filtering to "watched" shows only Discs where `watched` is true
- [ ] Tapping a disc card navigates to `/disc/:id`
- [ ] FAB is present and tappable (modal opens to nothing or a placeholder)
- [ ] `useCollection` hook has tests covering list fetch and watched filter

---

## Phase 4: Add disc modal

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9

### What to build

Implement the full 3-state add-disc modal triggered by the FAB. State 1
activates the BarcodeDetector API to capture a barcode, then fires the UPC
proxy; if BarcodeDetector is unsupported the modal opens directly to State 2
with a manual barcode entry field, no error shown. State 2 shows the resolved
candidate (poster, title, year, format selector) for confirmation; if the UPC
lookup returned nothing or the user rejects the match, a TMDB title search
field appears instead. Before the user confirms, a duplicate check runs
against the existing collection — if the barcode is already owned, a warning
is shown with an option to proceed anyway. State 3 shows a success message,
auto-closes after 1.5 s, and triggers a grid refresh. A failed save shows an
error within the modal (no State 3). The barcode is always stored on the Disc
regardless of which resolution path was used.

### Acceptance criteria

- [ ] Tapping the FAB opens the modal in the Scan state
- [ ] A successful barcode scan fires the UPC lookup and advances to the
      Confirm state with the resolved candidate pre-populated
- [ ] If BarcodeDetector is unsupported, the modal opens to the Confirm state
      with a manual barcode entry field — no error shown
- [ ] If the UPC lookup returns null, the Confirm state shows a TMDB title
      search field instead — no error shown
- [ ] The user can reject a pre-populated candidate and fall back to manual
      TMDB title search
- [ ] The format selector (4K / Blu-ray / DVD) is present and required
- [ ] Confirming a candidate calls `POST /api/discs` and advances to the
      Success state
- [ ] The Success state auto-closes after 1.5 s; the collection grid refreshes
- [ ] A failed `POST /api/discs` shows an error in the modal — no Success state
- [ ] If the barcode matches an existing Disc, the Confirm state shows "You
      already own this disc — add anyway?" before allowing the save
- [ ] Proceeding through the duplicate warning saves the second Disc normally
- [ ] The saved Disc document always contains the barcode, regardless of
      whether it was captured by scanner or typed manually
- [ ] `useAddDisc` hook has tests covering state transitions, duplicate warning
      surface, and pipeline orchestration

---

## Phase 5: Disc detail page — reads and TMDB freshness

**User stories**: 13, 14, 15, 32, 33

### What to build

Implement the `/disc/:id` page. On load, fetch `GET /api/discs/:id` which
returns the Disc joined with its TMDBMovie. Display the full metadata: poster,
title, year, overview, runtime, genres, directors, top 3 cast, TMDB rating.
Display the user's current personal rating and notes (read-only at this
stage). The server checks whether `cachedAt` on the TMDBMovie is older than
30 days; if so, it re-fetches from TMDB in the background, shows the cached
data immediately, and updates the response in place if data changed —
transparent to the user. No write actions are wired yet.

### Acceptance criteria

- [ ] Navigating to `/disc/:id` renders the film poster, title, year,
      overview, runtime, genres, directors, and top 3 cast
- [ ] The user's current `rating` and `notes` values are displayed (read-only)
- [ ] The page loads and shows cached data immediately even if a background
      TMDB re-fetch is in progress
- [ ] If `cachedAt` is older than 30 days the server silently re-fetches from
      TMDB and the updated data is reflected on the page without a reload
- [ ] If the background re-fetch fails, the page continues showing the cached
      data with no error shown to the user
- [ ] `cachedAt` is reset on every successful re-fetch regardless of whether
      the data changed

---

## Phase 6: Disc detail page — writes

**User stories**: 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
30, 31

### What to build

Wire all write actions on the detail page. Watched toggle: optimistic — flip
UI immediately, `PATCH /api/discs/:id` in the background; on failure revert
and show a toast. Marking watched increments `watchCount` and sets
`lastWatchedAt`; unmarking sets `watched` to false but preserves both fields.
Rating: optimistic — tap a star to set or clear, `PATCH` in the background,
revert on failure. Notes: auto-save on blur via `PATCH`; show a "Saved" toast
for 1.5 s on success; show "Failed — tap to retry" inline on failure. Delete:
server-confirmed — show a "Remove from collection?" confirmation dialog, call
`DELETE /api/discs/:id` on confirm, navigate back to the collection grid on
success; show an inline error on failure.

### Acceptance criteria

- [ ] Tapping the watched toggle flips the UI immediately without waiting for
      the server
- [ ] Marking a disc watched increments `watchCount` and sets `lastWatchedAt`
      to now
- [ ] Unmarking a disc watched sets `watched` to false; `watchCount` and
      `lastWatchedAt` are unchanged
- [ ] A failed watched-toggle write reverts the UI and shows a toast
- [ ] Tapping a star sets the rating immediately without waiting for the server
- [ ] Tapping the active star clears the rating
- [ ] A failed rating write reverts the UI and shows a toast
- [ ] Tapping away from the notes field triggers an auto-save `PATCH`
- [ ] A "Saved" toast appears for 1.5 s after a successful notes save
- [ ] A "Failed — tap to retry" message appears inline after a failed notes save
- [ ] Tapping the retry affordance re-attempts the notes save
- [ ] Tapping Delete shows a "Remove from collection?" confirmation dialog with
      Cancel and Remove actions
- [ ] Confirming Delete calls `DELETE /api/discs/:id` and navigates back to
      the collection grid
- [ ] Cancelling the Delete dialog dismisses it with no action taken
- [ ] A failed Delete shows an inline error without navigating away
- [ ] `useDisc` hook has tests covering optimistic update, revert-on-failure
      for watched toggle and rating, notes save, and delete
