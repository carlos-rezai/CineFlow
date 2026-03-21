# 01 — Collection Core

## Background

CineFlow is a personal 4K disc collection manager. The collection core is
the foundation of everything else — without it, there is no data for the
AI engine to reason about. It covers adding discs, displaying the
collection, viewing disc detail, marking watched, editing metadata, and
deleting discs.

---

## Problem

Define the full data model, add flow, UI structure, write semantics, and
server API for managing a physical disc collection backed by TMDB metadata
and MongoDB.

---

## Questions and Answers

**Q1: Is a Disc a thin wrapper around a TMDB movie, or does it carry its own identity?**
Separate Disc documents. Each physical disc is its own MongoDB document
with its own barcode, format, and addedAt. Multiple Discs can reference
the same TMDBMovie by tmdbId. One physical disc = one Disc document.

**Q1a: What are the Disc's own identity fields?**
barcode, format, addedAt, tmdbId, watched, lastWatchedAt, watchCount,
rating (1–5 nullable), notes (string nullable). loanedTo explicitly out
of scope.

**Q1b: What if the TMDB lookup fails?**
Block the save. No pending Disc documents. If the UPC lookup fails, drop
into manual TMDB title search. User must resolve TMDB before any write.

**Q2: Barcode → TMDB lookup chain?**
Option C: UPC API first, silent fallback to manual TMDB title search.
Happy path: scan → UPC API → title → TMDB search → user confirms.
If UPC fails or returns nothing, open manual search field with no error shown.
User confirmation is always required — no auto-save even on a perfect UPC match.
Barcode is always stored on the Disc regardless of which path resolved the match.

**Q3: What does "mark watched" mean?**
Hybrid: watched (boolean) + lastWatchedAt (ISO string | null) + watchCount (number).
Mark watched: watched = true, lastWatchedAt = now, watchCount++.
Mark unwatched: watched = false, lastWatchedAt and watchCount unchanged.
watchCount and lastWatchedAt are append-only in spirit.

**Q4: What TMDB fields are cached?**
Curated subset on a separate TMDBMovie document. TMDBMovie is shared — if
two Discs reference the same film they share one TMDBMovie document.
Before writing a new TMDBMovie, check if one with that tmdbId exists;
reuse it if found.

**Q5: Where does the scan UI live?**
FAB on CollectionPage opens an Ionic modal. 3-state flow:
State 1 (Scan), State 2 (Confirm), State 3 (Success).
BarcodeDetector fallback: if unsupported, modal opens directly to State 2
with a manual barcode entry field — no error shown.

**Q6: How is the collection displayed?**
Poster grid. Watched overlay (subtle dark + checkmark). Sort: addedAt desc.
Filter: watched/unwatched only at launch. Tapping a card opens /disc/:id.

**Q7: Optimistic UI or server-confirmed?**
Add disc: server-confirmed (modal has success state).
Watched toggle: optimistic — flip UI immediately, write in background,
silent retry, revert + toast on failure.
Rating tap: optimistic.
Notes: auto-save on blur, server-confirmed.
General rule: infrequent deliberate writes are server-confirmed.
Frequent toggles are optimistic with silent background sync.

**Q8: Notes field behaviour?**
Auto-save on blur. No save button. "Saved" toast disappears after 1.5s.
"Failed to save — tap to retry" on error. Server-confirmed (not optimistic).
500 char cap enforced server-side only — no client-side validation.
Ionic keyboard scroll handling required — flagged as a specific test target.

**Q9: Delete?**
Hard delete. Disc document only — TMDBMovie is never deleted (shared).
Confirm dialog on /disc/:id only ("Remove from collection?" + Cancel/Remove).
No delete affordance on the grid card. Grid refreshes after delete,
user lands back on CollectionPage.

**Q10: Duplicate detection?**
Warn and allow (Option A). Duplicate check at State 2 (confirm step),
not at scan time. Warning: "You already own this disc — add anyway?"
Two Disc documents with identical barcode and tmdbId is valid and intentional.

**Q11: TMDB cache staleness?**
Re-fetch if cachedAt is older than 30 days. On /disc/:id load only —
never on grid load. Background re-fetch, show cached data immediately,
update in place if data changed. Silent failure — cachedAt unchanged on fail.
cachedAt resets on every successful re-fetch, regardless of whether data changed.
30-day threshold is a server-side constant, not user configurable.

**Q12: Server routes?**

```
POST   /api/discs              — add Disc (duplicate check here)
GET    /api/discs?watched=     — list all, optional watched filter
GET    /api/discs/:id          — Disc + TMDBMovie joined
PATCH  /api/discs/:id          — partial update, any subset of fields
DELETE /api/discs/:id          — hard delete

GET    /api/tmdb/search?q=     — proxy TMDB title search (curated response)
GET    /api/upc/:barcode       — proxy UPC lookup (curated response)
```

No PUT. No bulk endpoints. TMDBMovie never exposed independently.
API keys never leave the server. Proxy routes return curated fields only.

---

## Design

### Data Model

```typescript
// MongoDB: discs collection
interface Disc {
  _id: ObjectId
  barcode: string
  format: '4K' | 'Blu-ray' | 'DVD'
  addedAt: string // ISO date
  tmdbId: number
  watched: boolean
  lastWatchedAt: string | null // ISO date
  watchCount: number
  rating: 1 | 2 | 3 | 4 | 5 | null
  notes: string | null // max 500 chars, enforced server-side
}

// MongoDB: tmdb_movies collection
interface TMDBMovie {
  _id: ObjectId
  tmdbId: number // unique index
  title: string
  year: number
  posterUrl: string
  overview: string
  runtime: number // minutes
  genres: string[]
  directors: string[]
  cast: string[] // top 3 billed
  tmdbRating: number // 0-10
  cachedAt: string // ISO date
}
```

### Add Disc Pipeline

```
lookupUpc(barcode: string): Promise<string | null>
  → calls /api/upc/:barcode
  → returns title string or null (silent fail)

searchTmdb(title: string): Promise<TmdbCandidate[]>
  → calls /api/tmdb/search?q=
  → returns [{ tmdbId, title, year, posterUrl }]
```

Two separate functions. UPC lookup returns a title string, not a TMDB ID.
That title feeds into TMDB search. User always confirms the candidate.

### Modal States

```
State 1 — Scan
  BarcodeDetector API → barcode captured → UPC lookup fires
  Fallback: BarcodeDetector unsupported → skip to State 2 with manual entry

State 2 — Confirm
  UPC hit:  poster + title + year + format selector + confirm / reject
  UPC miss: manual TMDB title search field
  Reject:   drops into manual TMDB title search
  Duplicate detected: "You already own this disc — add anyway?"

State 3 — Success
  Confirmation shown → auto-close after 1.5s or tap done
  Collection grid refreshes
```

### Write Semantics

| Operation      | Strategy         | On failure              |
| -------------- | ---------------- | ----------------------- |
| Add disc       | Server-confirmed | Show error in modal     |
| Watched toggle | Optimistic       | Revert + toast          |
| Rating tap     | Optimistic       | Revert + toast          |
| Notes blur     | Server-confirmed | "Failed — tap to retry" |
| Delete         | Server-confirmed | Show error              |

### File Locations

```
src/
  pages/
    CollectionPage.tsx       — grid + FAB
    DiscDetailPage.tsx        — /disc/:id
  components/
    AddDiscModal/
      AddDiscModal.tsx
      ScanState.tsx
      ConfirmState.tsx
      SuccessState.tsx
    DiscCard.tsx             — grid card
  hooks/
    useCollection.ts         — GET /api/discs, watched filter
    useDisc.ts               — GET /api/discs/:id, PATCH, DELETE
    useAddDisc.ts            — modal flow, UPC + TMDB pipeline
  lib/
    upc.ts                   — lookupUpc()
    tmdb.ts                  — searchTmdb()

server/src/
  routes/
    discs.ts                 — all /api/discs routes
    tmdb.ts                  — /api/tmdb/search proxy
    upc.ts                   — /api/upc/:barcode proxy
  services/
    discService.ts           — MongoDB disc CRUD
    tmdbMovieService.ts      — MongoDB TMDBMovie CRUD + dedup
  lib/
    tmdbClient.ts            — TMDB API calls
    upcClient.ts             — UPC API calls
```

### Chosen Approach ✅ / Rejected ❌

✅ Separate Disc + TMDBMovie documents, linked by tmdbId
❌ Embedding TMDB data inside Disc — would duplicate data for shared films

✅ UPC API → title → TMDB search → user confirms (Option C with fallback)
❌ Auto-save on successful UPC match — UPC databases have errors, wrong
matches are worse than no match

✅ Hard delete, Disc only, confirm dialog on detail page
❌ Soft delete — adds filter overhead to every query for no benefit in a
personal app

✅ One general PATCH /api/discs/:id for all partial updates
❌ Separate endpoints per field — more routes, same result

✅ 30-day background TMDB re-fetch on detail page load only
❌ Re-fetch on grid load — would fire dozens of TMDB calls on app open

---

## Implementation Plan

**Phase 1 — Data layer + bare API**
MongoDB connection. Disc and TMDBMovie services. All 7 routes wired up
with real MongoDB reads/writes. No UI beyond what already exists.
End state: can POST a hardcoded disc via curl and GET it back.

**Phase 2 — TMDB + UPC proxy routes**
tmdbClient, upcClient, proxy routes with curated response shaping.
lookupUpc() and searchTmdb() functions with tests.
End state: can call /api/tmdb/search?q=blade+runner and get candidates.

**Phase 3 — CollectionPage grid**
useCollection hook. DiscCard component. Poster grid with watched overlay.
Watched/unwatched filter. FAB (no modal yet — FAB is a placeholder).
End state: collection renders from real MongoDB data.

**Phase 4 — Add disc modal**
Full 3-state modal. BarcodeDetector + fallback. Duplicate detection.
useAddDisc hook. TMDBMovie dedup on write.
End state: can scan or search, confirm, and see new disc in grid.

**Phase 5 — Disc detail page**
/disc/:id. Watched toggle (optimistic). Rating (optimistic).
Notes (auto-save on blur). Delete with confirm. 30-day TMDB re-fetch.
End state: full CRUD on a disc from the UI.

---

## Trade-offs

**Easier:**

- AI engine has clean, consistent TMDBMovie data to reason about
- No TMDB data duplication across shared films
- Simple write semantics — most operations are fire-and-forget

**Harder:**

- JOIN required on every disc read (Disc + TMDBMovie)
- Two API calls at add time (UPC + TMDB credits)
- BarcodeDetector fallback adds modal state complexity

**Explicitly out of scope:**

- loanedTo / disc lending
- Watch history array (watchCount + lastWatchedAt is sufficient)
- Sort by title / filter by genre / filter by format / filter by director
- Bulk operations
- Soft delete / archive
- Client-side notes validation
- User-configurable TMDB cache TTL
