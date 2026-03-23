# Plan: Collection Intelligence

> Source PRD: https://github.com/carlos-rezai/CineFlow/issues/9

## Architectural decisions

- **Route**: `GET /api/stats` — registered in `server/src/index.ts` alongside existing routes
- **Schema**: No changes. All fields required for aggregation (`watchCount`, `watched`, `rating`, `runtime`, `genres`, `directors`) already exist on `discs` and `tmdb_movies` collections.
- **Key models**: `CollectionStats`, `DirectorStat`, `GenreStat` — defined as frontend types, mirrored as server return type
- **Aggregation**: Single MongoDB pipeline joining `discs` → `tmdb_movies` on `tmdbId`, following the same `$lookup` pattern already used in `listDiscs`
- **Refresh signal**: `useCollection` will expose a `refreshToken: number` in `UseCollectionResult`. It mirrors the existing internal `fetchVersion` ref as a state value — same counter, also tracked as state so React can propagate it. `useStats` accepts this as its re-fetch trigger. No new counter in `CollectionPage`.
- **No caching**: Stats recomputed on every request.

---

## Phase 1: Stats endpoint

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 11

### What to build

A `statsService` that runs a single MongoDB aggregation pipeline over the `discs` and `tmdb_movies` collections and returns a `CollectionStats` document. A `GET /api/stats` route that calls the service and returns the result as JSON. The route is registered in the server entry point.

The aggregation computes in one pass:

- Disc counts (total, watched, unwatched), `watchedPercent` (1 decimal)
- `totalWatchCount` as the **sum of `disc.watchCount`** across all Discs — not the count of `watched=true` Discs
- Total and unwatched runtime via the `tmdb_movies` join
- `averageRating` across rated Discs only (null if none rated), 1 decimal
- Format breakdown (4K / Blu-ray / DVD counts)
- All genres sorted by Disc count descending
- All directors sorted by `discCount` descending, each with `discCount`, `watchedCount`, and `titles[]`

### Acceptance criteria

- [ ] `GET /api/stats` returns HTTP 200 with a valid `CollectionStats` JSON payload
- [ ] `totalWatchCount` is the sum of all `disc.watchCount` values, not the count of `watched=true` Discs
- [ ] `averageRating` is `null` when no Discs are rated; computed only over rated Discs when some are rated
- [ ] `watchedPercent` is rounded to 1 decimal place, computed server-side
- [ ] Directors are sorted by `discCount` descending; each entry includes `name`, `discCount`, `watchedCount`, and `titles[]`
- [ ] Genres are sorted by count descending
- [ ] All `statsService` tests pass: mixed collection counts, `totalWatchCount` semantics, `averageRating` null/partial, director sort, genre sort
- [ ] Route is registered and reachable alongside `/api/discs`, `/api/tmdb`, `/api/upc`

---

## Phase 2: useStats hook

**User stories**: 11, 12

### What to build

Three changes to the data layer:

1. **`useCollection` update**: Add a `refreshToken: number` to `UseCollectionResult`. Inside `fetchDiscs`, mirror the existing `fetchVersion` ref increment into a state counter. Same value, also reactive. `CollectionPage` passes `refreshToken` down to `useStats`.

2. **`CollectionStats` frontend type**: Define `CollectionStats`, `DirectorStat`, and `GenreStat` as TypeScript interfaces in `src/types/`.

3. **`useStats` hook**: Accepts `refreshToken: number`. Fetches `GET /api/stats` on mount and whenever `refreshToken` changes. Returns `{ stats: CollectionStats | null, loading: boolean }`. On fetch failure, `stats` stays `null` — no error state, no error surface.

### Acceptance criteria

- [ ] `useCollection` exposes `refreshToken` in its return value; existing hook behaviour and tests are unchanged
- [ ] `useStats` returns `CollectionStats` on a successful fetch
- [ ] `useStats` returns `stats: null` while loading
- [ ] `useStats` returns `stats: null` on fetch failure (silent degradation)
- [ ] `useStats` re-fetches when `refreshToken` changes
- [ ] All `useStats` tests pass
- [ ] All existing `useCollection` tests still pass

---

## Phase 3: CollectionPage summary section

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12

### What to build

An always-visible, non-collapsible summary section added to `CollectionPage` above the disc grid. `CollectionPage` calls `useStats(refreshToken)` where `refreshToken` comes from `useCollection`. The section renders nothing when `stats` is `null` (silent degradation — the disc grid is unaffected).

The section has three parts:

**Summary bar** (one compact row):

- Total disc count
- Unwatched count and watched percentage
- Unwatched runtime formatted as hours and minutes
- Average rating (hidden when `null`)

**Director breakdown** (below bar):

- Directors with `discCount ≥ 2` only (UI filter — API returns all)
- Each row: director name, disc count, watched/total
- Sorted by `discCount` descending (order from API)

**Genre breakdown** (below directors):

- Top 5 genres by count (hardcoded cap in the component)
- Each row: genre name and count

A dedicated CSS file covers the summary section layout. No inline styles.

### Acceptance criteria

- [ ] Summary section is always visible above the disc grid when `stats` is loaded
- [ ] Summary bar shows totalDiscs, unwatchedCount, watchedPercent, unwatchedRuntimeMinutes (as `Xh Ym`), and averageRating (hidden if null)
- [ ] Director breakdown shows only directors with `discCount ≥ 2`; each row shows name, disc count, watched/total
- [ ] Genre breakdown shows top 5 genres with counts
- [ ] When `stats` is `null`, the summary section renders nothing — disc grid and filter are unaffected
- [ ] Stats refresh automatically after a Disc is added or marked watched (refreshToken propagation)
- [ ] No inline styles — all layout in a CSS file
