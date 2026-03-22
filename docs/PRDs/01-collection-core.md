# PRD 01 — Collection Core

## Problem Statement

I own a physical 4K disc collection spread across hundreds of titles, with no
way to track what I own, what I've watched, or how many times I've seen
something. When I want to decide what to watch next, I have no structured
data to reason against. I need a system that lets me scan a disc's barcode,
confirm the film, and save it to a persistent collection — then let me mark
it watched, rate it, and add notes over time.

---

## Solution

A mobile-first web app where I can scan a disc barcode using my device camera.
The barcode resolves to a film title via a UPC API, which then feeds a TMDB
search so I can confirm the correct film before it's saved. If the UPC lookup
fails, I type a title manually and pick from TMDB results. Once confirmed, the
Disc is saved to MongoDB alongside a shared TMDBMovie metadata document. I
can then browse my Collection as a poster grid, tap into a Disc's detail page
to mark it watched, rate it, write notes, or delete it.

---

## User Stories

1. As a collector, I want to scan a barcode on my disc case, so that the film
   is added to my collection automatically without manual data entry.
2. As a collector, I want to confirm the matched film before it's saved, so
   that wrong UPC database matches don't corrupt my collection.
3. As a collector, I want to manually search for a film by title when the
   barcode lookup finds nothing, so that I can still add discs whose barcodes
   aren't in the UPC database.
4. As a collector, I want to select the format (4K, Blu-ray, DVD) when adding
   a disc, so that each physical object is accurately represented.
5. As a collector, I want the barcode always stored on the Disc regardless of
   which lookup path was used, so that the physical object is always
   identifiable.
6. As a collector, I want to see a success confirmation after a disc is saved,
   so that I know the add operation completed.
7. As a collector, I want the collection grid to refresh automatically after I
   add a disc, so that the new disc appears without a manual reload.
8. As a collector, I want to be warned if I'm adding a disc with a barcode I
   already own, so that accidental duplicates are surfaced before I commit.
9. As a collector, I want to proceed with adding a duplicate if I choose, so
   that owning the same film on two formats is valid and supported.
10. As a collector, I want to browse my collection as a poster grid sorted by
    most recently added, so that I can quickly see what I've added recently.
11. As a collector, I want unwatched discs visually distinguished from watched
    ones in the grid, so that I can see at a glance how much of my collection
    I haven't seen.
12. As a collector, I want to filter the grid to show only unwatched or only
    watched discs, so that I can focus on what I still need to watch.
13. As a collector, I want to tap a disc card to open its detail page, so that
    I can see full metadata and take actions on it.
14. As a collector, I want to see the film's poster, title, year, overview,
    runtime, genres, directors, and top cast on the detail page, so that I
    have context without leaving the app.
15. As a collector, I want to see my personal rating and notes on the detail
    page alongside the TMDB metadata, so that everything about a disc is in
    one place.
16. As a collector, I want to mark a disc as watched, so that my watch status
    is tracked.
17. As a collector, I want the watched toggle to respond immediately, so that
    the UI feels fast and doesn't block me while the server writes.
18. As a collector, I want the watched count to increment each time I mark a
    disc watched, so that I can track rewatches.
19. As a collector, I want the last watched date updated when I mark a disc
    watched, so that I know exactly when I most recently watched it.
20. As a collector, I want to unmark a disc as watched, so that I can correct
    mistakes.
21. As a collector, I want the watch count and last watched date preserved when
    I unmark a disc, so that historical watch data isn't lost.
22. As a collector, I want to rate a disc from 1 to 5 stars, so that I can
    record my personal opinion.
23. As a collector, I want my rating to update immediately, so that tapping a
    star feels instant.
24. As a collector, I want to clear my rating, so that I can remove a rating
    I'm no longer happy with.
25. As a collector, I want to write free-text notes on a disc (e.g. "steelbook
    edition"), so that I can record details that don't fit structured fields.
26. As a collector, I want notes auto-saved when I tap away from the field, so
    that I never have to remember to save manually.
27. As a collector, I want a brief "Saved" confirmation after notes auto-save,
    so that I know the save worked.
28. As a collector, I want a "Failed — tap to retry" message if notes fail to
    save, so that I don't silently lose what I wrote.
29. As a collector, I want to delete a disc from its detail page, so that I
    can remove discs I no longer own.
30. As a collector, I want a confirmation dialog before a disc is deleted, so
    that I don't accidentally remove something.
31. As a collector, I want to be returned to the collection grid after a delete,
    so that the flow feels natural.
32. As a collector, I want TMDB metadata to stay reasonably fresh, so that
    poster URLs and overviews don't go stale.
33. As a collector, I want stale metadata refreshed silently in the background
    on the detail page, so that I see cached data immediately while any update
    happens behind the scenes.

---

## Implementation Decisions

### Data Model

Two MongoDB collections: `discs` and `tmdb_movies`.

**Disc document fields:** `_id`, `barcode`, `format` (`'4K' | 'Blu-ray' | 'DVD'`),
`addedAt` (ISO string), `tmdbId` (number), `watched` (boolean),
`lastWatchedAt` (ISO string | null), `watchCount` (number),
`rating` (1–5 | null), `notes` (string | null, max 500 chars enforced
server-side).

**TMDBMovie document fields:** `_id`, `tmdbId` (unique index), `title`,
`year`, `posterUrl`, `overview`, `runtime` (minutes), `genres` (string[]),
`directors` (string[]), `cast` (top 3 billed, string[]), `tmdbRating` (0–10),
`cachedAt` (ISO string).

TMDBMovie documents are shared across Discs. Before writing a new TMDBMovie,
check for an existing document by `tmdbId`; reuse if found. A TMDBMovie is
never deleted, even when its referencing Disc is deleted.

### Add Disc Pipeline

Two separate resolution functions:

- `lookupUpc(barcode)` — calls `/api/upc/:barcode`, returns a title string
  or null. Silent failure.
- `searchTmdb(title)` — calls `/api/tmdb/search?q=`, returns an array of
  TmdbCandidates: `{ tmdbId, title, year, posterUrl }`.

Happy path: scan → UPC lookup → title string → TMDB search → user confirms
a TmdbCandidate → Disc written.

Fallback: if UPC lookup returns null, open manual title entry field with no
error shown. User types title → TMDB search → user confirms.

User confirmation is always required — no auto-save even on a perfect UPC
match.

### Duplicate Detection

Checked server-side on POST `/api/discs` before writing. If a Disc with the
same barcode already exists, the server returns a warning payload. The
Confirm state surfaces "You already own this disc — add anyway?" and allows
the user to proceed. Two Discs with identical barcode and tmdbId is valid.

### Modal States

Three states managed by `useAddDisc`:

- **State 1 (Scan):** BarcodeDetector API captures barcode, fires UPC lookup.
  If BarcodeDetector is unsupported, skip directly to State 2 with a manual
  barcode entry field — no error shown.
- **State 2 (Confirm):** If UPC hit, show poster + title + year + format
  selector + confirm/reject. If UPC miss or user rejects, show manual TMDB
  title search. Duplicate warning shown here if applicable.
- **State 3 (Success):** Confirmation message. Auto-close after 1.5s or user
  taps Done. Collection grid refreshes.

### Write Semantics

| Operation      | Strategy         | On failure              |
| -------------- | ---------------- | ----------------------- |
| Add disc       | Server-confirmed | Show error in modal     |
| Watched toggle | Optimistic       | Revert + toast          |
| Rating tap     | Optimistic       | Revert + toast          |
| Notes blur     | Server-confirmed | "Failed — tap to retry" |
| Delete         | Server-confirmed | Show error              |

### Server API

```
POST   /api/discs              — add Disc (includes duplicate check)
GET    /api/discs?watched=     — list Discs, optional watched filter
GET    /api/discs/:id          — Disc + TMDBMovie joined
PATCH  /api/discs/:id          — partial update, any subset of writable fields
DELETE /api/discs/:id          — hard delete (Disc only)

GET    /api/tmdb/search?q=     — proxy TMDB title search, returns TmdbCandidates
GET    /api/upc/:barcode       — proxy UPC lookup, returns title string or null
```

No PUT. No bulk endpoints. API keys never leave the server. Proxy routes
return curated fields only.

### TMDB Cache Staleness

Server-side constant: 30 days. Checked on `/api/discs/:id` load only — never
on grid load. If `cachedAt` is older than 30 days, re-fetch from TMDB in the
background. Show cached data immediately; update in place if data changed.
`cachedAt` resets on every successful re-fetch regardless of whether data
changed. Silent failure — `cachedAt` is unchanged if the re-fetch fails.

### Modules

**Client:**

- `useCollection` — fetches disc list, exposes watched filter, refresh trigger
- `useDisc` — fetches single disc detail, exposes PATCH and DELETE
- `useAddDisc` — owns the 3-state modal flow, orchestrates UPC + TMDB pipeline
- `upc.ts` (`lookupUpc`) — UPC API call via server proxy
- `tmdb.ts` (`searchTmdb`) — TMDB search via server proxy

**Server:**

- `discService` — MongoDB CRUD for Discs (create, read, list, update, delete, duplicate check)
- `tmdbMovieService` — MongoDB CRUD for TMDBMovies (upsert by tmdbId, staleness check, re-fetch)
- `tmdbClient` — raw TMDB API calls, shapes to curated fields
- `upcClient` — raw UPC API calls, shapes to title string or null
- Route handlers for all 7 endpoints

---

## Testing Decisions

**What makes a good test:** Test external behaviour through the public
interface of a module — inputs in, outputs or side-effects out. Do not test
implementation details, internal state, or private functions. Tests should
remain valid after an internal refactor that preserves behaviour.

**Modules with tests:**

- `upc.ts` — test that `lookupUpc` returns a title string on a successful
  response and null on failure/empty
- `tmdb.ts` — test that `searchTmdb` returns correctly shaped TmdbCandidate
  arrays
- `discService` — test create, read, list (with watched filter), partial
  update, delete, and duplicate detection against a real MongoDB test
  database
- `tmdbMovieService` — test upsert-or-reuse logic, staleness threshold,
  background re-fetch behaviour
- `tmdbClient` — test response shaping to curated fields
- `upcClient` — test response shaping to title string or null
- `useAddDisc` — test the modal state machine transitions, duplicate warning
  surface, and pipeline orchestration

**Prior art:** `src/lib/__tests__/placeholder.test.ts` establishes the
Vitest + testing-library setup. New tests follow the same file structure:
`__tests__/` co-located with the module under test.

---

## Out of Scope

- Disc lending / `loanedTo` field
- Watch history array (watchCount + lastWatchedAt is sufficient)
- Sort by title, filter by genre, format, or director
- Bulk operations (bulk add, bulk delete)
- Soft delete / archive
- Client-side notes length validation
- User-configurable TMDB cache TTL
- AI-powered watch suggestions (Collection Intelligence, Mood Engine, Decision Pipeline — future phases)

---

## Further Notes

- The `Disc` lifecycle begins at **Confirm**, not at **Scan**. A Disc document
  is never written until the user approves a TmdbCandidate.
- "rating" always requires qualification in code: `disc.rating` (1–5 user
  score) vs `tmdbMovie.tmdbRating` (0–10 from TMDB). Never use `rating` alone
  as a field name without the qualifying context.
- The 5-phase implementation order (data layer → proxies → grid → add modal →
  detail page) ensures each phase is independently testable and deployable.
