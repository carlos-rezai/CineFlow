## Problem Statement

The user has no aggregate view of their Collection. After adding dozens of Discs, there is no way to see at a glance how many are unwatched, how many hours of film are left to watch, which directors dominate the shelf, or what the user's average personal rating is. The Collection is a list with no intelligence on top of it.

This information is also needed by the Phase 4 AI decision pipeline to reason about what to watch next — it needs to know the shape of the collection, not just individual Discs.

## Solution

A single `GET /api/stats` endpoint that returns a rich `CollectionStats` payload computed via a MongoDB aggregation pipeline. The stats are displayed as a permanent summary section at the top of CollectionPage (above the disc grid) and are designed so the Phase 4 AI decision pipeline can call the same endpoint directly with no rework.

## User Stories

1. As a collector, I want to see how many Discs are in my Collection at a glance, so that I know the size of my shelf without counting manually.
2. As a collector, I want to see how many Discs I have not yet watched, so that I know how much of my Collection I still have to get through.
3. As a collector, I want to see my watched percentage, so that I can track my progress through the Collection.
4. As a collector, I want to see the total unwatched runtime in hours and minutes, so that I know how much viewing time is waiting for me.
5. As a collector, I want to see my average personal rating across the Collection, so that I have a sense of my overall satisfaction with my purchases.
6. As a collector, I want to see how many Discs I own in each Format (4K, Blu-ray, DVD), so that I understand the composition of my shelf.
7. As a collector, I want to see my top genres by Disc count, so that I can see which types of film dominate my Collection.
8. As a collector, I want to see which directors I own the most Discs from, so that I can identify the filmmakers I have invested in most.
9. As a collector, I want to see how many of each director's Discs I have watched vs. owned, so that I can identify directors whose work I have not fully explored.
10. As a collector, I want the summary section to always be visible when I open the Collection, so that I get context immediately without navigating elsewhere.
11. As a collector, I want the stats to refresh automatically after I add a Disc or mark one as watched, so that the numbers are always current within my session.
12. As a collector, I want the Collection to still function normally if stats fail to load, so that a stats error never blocks me from browsing my Discs.

## Implementation Decisions

### Stats endpoint

- A single `GET /api/stats` endpoint returns a `CollectionStats` payload.
- Computed server-side via a single MongoDB aggregation pipeline joining the discs and tmdb_movies collections. No application-level arithmetic.
- No caching — recomputed on every request. The Collection is personal-scale; caching adds complexity without meaningful benefit.
- The endpoint is designed for dual consumption: the UI calls it, and the Phase 4 AI decision pipeline will call it directly.

### CollectionStats payload fields

- `totalDiscs` — count of all Discs in the Collection
- `watchedCount` — count of Discs where watched=true
- `unwatchedCount` — count of Discs where watched=false
- `watchedPercent` — computed server-side, rounded to 1 decimal place
- `totalWatchCount` — the sum of all disc.watchCount values across the Collection, not the count of Discs where watched=true. A Disc watched three times contributes 3.
- `totalRuntimeMinutes` — sum of all linked TMDBMovie.runtime values
- `unwatchedRuntimeMinutes` — sum of TMDBMovie.runtime for Discs where watched=false
- `averageRating` — mean of all non-null Disc.rating values, rounded to 1 decimal; null if no Discs are rated
- `formatBreakdown` — disc counts keyed by Format (4K, Blu-ray, DVD)
- `topGenres` — all genres from linked TMDBMovies, sorted by Disc count descending
- `directors` — all director names from linked TMDBMovies, sorted by Disc count descending, each with discCount, watchedCount, and an array of titles owned

### Director completion

- "Director completion" means owned-only grouping. It counts how many Discs in the Collection share a director's name.
- No comparison against a director's full TMDB filmography. That is a shopping feature, not a watch feature, and is explicitly out of scope.
- The API returns all directors with no cap. The UI filters to directors with 2 or more Discs for display. The full list is available to the AI pipeline.

### Frontend hook — useStats

- Accepts a refreshToken parameter, which is useCollection's existing fetchVersion counter passed down from CollectionPage. No new counter is introduced.
- Stats and the disc list refresh together — adding a Disc or toggling watched triggers both.
- Returns { stats: CollectionStats | null, loading: boolean }.
- Silent degradation on error: stats stays null, no error surface in the UI. Stats are context, not critical path.

### UI — CollectionPage summary section

- A permanent, always-visible compact summary section sits above the disc grid. Not collapsible.
- Summary bar (one row): totalDiscs, unwatchedCount, watchedPercent, unwatchedRuntimeMinutes (formatted as hours and minutes), averageRating (hidden if null).
- Director breakdown (below bar): directors with 2 or more Discs, showing director name, disc count, and watched/total. Sorted by disc count descending. Single-disc directors omitted from display only — still returned by the API.
- Genre breakdown (below directors): top 5 genres by disc count, hardcoded in the component. Genre name and count per row.
- The stats section renders nothing (no empty states, no skeleton) if stats is null.

### New modules

- statsService — the aggregation pipeline. Single exported function returning CollectionStats. No side effects.
- GET /api/stats route — thin handler calling statsService.
- CollectionStats type — shared frontend type definition for the payload shape.
- useStats hook — fetches /api/stats, accepts refreshToken, returns { stats, loading }.
- Stats summary section — UI component or JSX block within CollectionPage with its own CSS file.

## Testing Decisions

Good tests verify observable behaviour through the public interface of a module, not implementation details.

### statsService tests (server)

Follow the pattern of existing server service tests (discService, tmdbMovieService) which stub the MongoDB collection and assert on the returned value.

Tests to cover:

- Returns correct watchedCount and unwatchedCount for a mixed collection
- totalWatchCount is the sum of all disc.watchCount values — a disc watched 3 times contributes 3, not 1
- averageRating is null when no Discs are rated
- averageRating is computed only across rated Discs (unrated Discs do not drag the average toward zero)
- Directors are sorted by discCount descending
- Genres are sorted by count descending

### useStats tests (frontend hook)

Follow the pattern of existing hook tests (useDisc, useCollection) which stub global fetch and use renderHook + waitFor.

Tests to cover:

- Returns a populated CollectionStats on a successful fetch
- stats is null while loading
- stats stays null on fetch failure (silent degradation)
- Re-fetches when refreshToken changes

No tests are needed for the stats UI section — following the existing project pattern where components have no tests.

## Out of Scope

- TMDB filmography comparison — "You own 4 of Denis Villeneuve's 9 feature films." Requires fetching and caching each director's full filmography from TMDB. This is a shopping/discovery feature, not a watch feature.
- Stats caching — Not justified at personal-collection scale.
- Dedicated StatsPage or tab — Stats are context for the Collection view, not a navigation destination.
- Per-disc watch history — Only watchCount and lastWatchedAt are stored. A full watch log is a separate feature.
- Genre or director filtering from the stats section — Tapping a genre or director does not filter the disc grid. Stats are read-only context.
- Server-side refactoring — No route validation or schema changes in this feature.

## Further Notes

- totalWatchCount and watchedCount are distinct terms with distinct semantics. watchedCount is the number of Discs where watched=true. totalWatchCount is the sum of all disc.watchCount values. These must never be conflated in code or conversation.
- The refreshToken passed to useStats is useCollection's fetchVersion ref counter — not a new mechanism. This is the same pattern used internally by useCollection to prevent stale fetch responses.
- The CollectionStats payload is the primary context document the Phase 4 AI decision pipeline will use to understand the state of the Collection. Field names and semantics must remain stable.
