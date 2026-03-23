# 02 — Collection Intelligence

## Background

Collection core is complete (see 01-collection-core.md). Every Disc document
carries `watchCount`, `watched`, `lastWatchedAt`, and `rating`. Every
TMDBMovie document carries `runtime`, `genres`, `directors`, and `cast`. All
data required for aggregation is present with no schema changes.

Collection intelligence is Phase 2 of the AI build order. It must serve two
consumers simultaneously: the UI (a summary section on CollectionPage) and the
Phase 4 AI decision pipeline, which will call the stats endpoint directly.

## Problem

The collection has no aggregate view. There is no way to answer:

- How many discs are unwatched, and how long would they take?
- Which directors does the user own the most of?
- What genres dominate the collection?
- What is the user's average personal rating?

These answers are needed both for the UI and for the AI pipeline to reason
about watch suggestions.

## Questions and Answers

**Q: Is collection intelligence for the UI, the AI pipeline, or both?**
A: Both. The stats endpoint must be designed so the AI pipeline can call it
directly in Phase 4 with no rework.

**Q: What stats are included?**
A: totalDiscs, watchedCount, unwatchedCount, watchedPercent, totalWatchCount,
totalRuntimeMinutes, unwatchedRuntimeMinutes, averageRating, formatBreakdown,
topGenres, directors. All in a single `/api/stats` endpoint.

**Q: What does "director completion" mean — owned-only or TMDB filmography comparison?**
A: Owned-only. Group by director name across the collection. No TMDB
filmography lookup. Full comparison is out of scope.

**Q: What does each director group contain?**
A: `{ name, discCount, watchedCount, titles[] }`. All directors returned,
sorted by discCount descending, no cap. Frontend filters for display.

**Q: Is totalWatchCount the sum of disc.watchCount or the count of watched=true discs?**
A: Sum of all `disc.watchCount` values. A disc watched three times contributes
3, not 1.

**Q: Is averageRating computed across all discs or only rated ones?**
A: Only rated discs. Returns null when no discs are rated. Rounded to 1 decimal.

**Q: Should stats be cached?**
A: No. Recompute on every request. Collection is small; caching adds complexity
without meaningful benefit.

**Q: Where do stats surface in the UI?**
A: Always-visible compact summary section on CollectionPage, above the disc
grid. Never collapsible. Not a dedicated page or tab.

**Q: What is in the summary bar vs. the breakdowns?**
A: Summary bar: totalDiscs, unwatchedCount, watchedPercent,
unwatchedRuntimeMinutes, averageRating. Director breakdown below (discCount ≥ 2
in UI). Genre breakdown below directors (top 5 hardcoded in component).

**Q: How does useStats refresh?**
A: Wired to useCollection's existing `fetchVersion` counter as `refreshToken`.
No new counter. Stats and disc list refresh together after add/watched toggle.

**Q: What happens when stats fail to load?**
A: Silent degradation. `stats` stays null. No error surface in the UI. Stats
are context, not critical.

## Design

### Stats payload type

```ts
// src/types/stats.ts (new)
export interface DirectorStat {
  name: string
  discCount: number
  watchedCount: number
  titles: string[]
}

export interface GenreStat {
  genre: string
  count: number
}

export interface CollectionStats {
  totalDiscs: number
  watchedCount: number
  unwatchedCount: number
  watchedPercent: number // server-side, rounded to 1 decimal
  totalWatchCount: number // sum of all disc.watchCount
  totalRuntimeMinutes: number
  unwatchedRuntimeMinutes: number
  averageRating: number | null // null if no discs rated; 1 decimal
  formatBreakdown: {
    '4K': number
    'Blu-ray': number
    DVD: number
  }
  topGenres: GenreStat[] // all genres, sorted by count desc
  directors: DirectorStat[] // all directors, sorted by discCount desc
}
```

### File paths

```
server/src/services/statsService.ts       ✅ new — aggregation pipeline
server/src/routes/stats.ts                ✅ new — GET /api/stats
server/src/__tests__/statsService.test.ts ✅ new — follows server/__tests__/ pattern
src/types/stats.ts                        ✅ new — shared payload types (frontend)
src/hooks/useStats.ts                     ✅ new — fetches /api/stats
src/hooks/__tests__/useStats.test.ts      ✅ new
src/pages/CollectionPage.tsx              ✅ modified — add stats section
```

### Approach

✅ **Single MongoDB aggregation pipeline** in `statsService.ts`. One `$lookup`
join (discs → tmdb_movies on tmdbId), all fields computed in one pass.

❌ **Application-level computation** — rejected. Aggregation is more efficient
and keeps logic server-side where the AI pipeline can consume it directly.

❌ **Dedicated StatsPage** — rejected. Stats are context for the collection
view, not a destination. No new tab needed.

❌ **TMDB filmography comparison for director completion** — rejected. Requires
fetching and caching each director's full filmography. Out of scope; "director
completion" means owned-only for this feature.

❌ **Caching** — rejected. Collection is small; complexity not justified.

### useStats hook interface

```ts
export interface UseStatsResult {
  stats: CollectionStats | null
  loading: boolean
}

export function useStats(refreshToken: number): UseStatsResult
```

`refreshToken` is `fetchVersion.current` from `useCollection`, passed down
from `CollectionPage`. Stats re-fetch whenever the token changes.

### UI layout (CollectionPage)

```
┌─────────────────────────────────────────────┐
│  [Summary bar]                              │
│  47 discs · 12 unwatched · 34% watched      │
│  14h 22m unwatched · ★ 3.8 avg             │
├─────────────────────────────────────────────┤
│  Directors (≥2 discs)                       │
│  Denis Villeneuve  4 discs  2/4 watched     │
│  Christopher Nolan 3 discs  3/3 watched     │
├─────────────────────────────────────────────┤
│  Top genres                                 │
│  Science Fiction 14 · Drama 11 · …         │
├─────────────────────────────────────────────┤
│  [Disc grid]                                │
└─────────────────────────────────────────────┘
```

## Implementation Plan

**Phase 1 — Stats endpoint**

- `statsService.ts` with aggregation pipeline
- `GET /api/stats` route
- `server/src/__tests__/statsService.test.ts`

**Phase 2 — Frontend hook**

- `src/types/stats.ts`
- `src/hooks/useStats.ts` wired to refreshToken
- `src/hooks/__tests__/useStats.test.ts`

**Phase 3 — UI**

- Stats section added to `CollectionPage.tsx`
- Stats section CSS

## Trade-offs

**Easier:** AI pipeline gets a single fast endpoint returning all collection
context. UI stats stay fresh without a separate refresh mechanism. Director
and genre data requires no schema changes.

**Harder:** The aggregation pipeline is moderately complex — any schema change
to discs or tmdb_movies will require updating it.

**Out of scope:**

- TMDB filmography comparison ("you own 4 of 9 Villeneuve films")
- Stats caching
- Dedicated stats page or tab
- Per-disc watch history (only watchCount and lastWatchedAt are stored)
