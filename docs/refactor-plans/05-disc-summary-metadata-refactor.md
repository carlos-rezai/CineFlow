# 05 — Disc Summary Metadata Refactor

## Problem Statement

`DiscSummary` (the frontend type for list-view discs) only includes `posterUrl`
and `title` from the joined `TMDBMovie`. The fields `year`, `runtime`, and
`tmdbRating` are missing. The `listDiscs()` aggregate on the server does not
project them. As a result, `DiscCard` cannot render the metadata row
(`2017 · 164 MIN · ★ 7.9`) that the Aperture Noir design specifies beneath
the title. The detail page (`DiscDetailPage`) already has these fields via
`getDisc()` — the gap is exclusively in the list path.

## Solution

Extend the `listDiscs()` MongoDB aggregate to project `year`, `runtime`, and
`tmdbRating` from the joined `tmdb_movies` document. Update `DiscListItem` on
the server and `DiscSummary` on the frontend to carry those three fields as
`number | null`. Render the metadata row in `DiscCard`, hiding any segment
whose value is null rather than displaying a misleading zero.

`getCandidates()`, `getDisc()`, and all AI pipeline paths are untouched.

## Commits

### Commit 1 — Backend: extend `listDiscs` aggregate and `DiscListItem` type

Add `year`, `runtime`, and `tmdbRating` to the `$addFields` stage of the
`listDiscs()` aggregate in `discService.ts`, pulling each from the `$lookup`
result with a `null` fallback (not an empty string or zero). Add all three to
the `$project` stage. Update the `DiscListItem` type in `server/src/types/index.ts`
to declare `year: number | null`, `runtime: number | null`,
`tmdbRating: number | null`.

Add one new test to `discService.test.ts`: seed a `TMDBMovie` document, create
a disc referencing it, call `listDiscs()`, and assert that `year`, `runtime`,
and `tmdbRating` all match the seeded values. The existing tests that call
`listDiscs()` without seeding a `TMDBMovie` implicitly cover the null path;
no changes needed there.

The backend now returns the new fields. No frontend change yet; the app
remains fully working.

### Commit 2 — Frontend: extend `DiscSummary` type

Add `year: number | null`, `runtime: number | null`, `tmdbRating: number | null`
to `DiscSummary` in `src/types/disc.ts`. No rendering change yet. TypeScript
now knows about the fields; the app remains fully working.

### Commit 3 — Frontend: render metadata row in `DiscCard`

Add the metadata row beneath the title in `DiscCard`. Each segment is
conditionally rendered:

- year segment rendered only when `disc.year !== null`
- runtime segment rendered only when `disc.runtime !== null`, formatted as
  `164 MIN`
- tmdbRating segment rendered only when `disc.tmdbRating !== null`, formatted
  as `★ 7.9`
- If all three are null, the metadata row element is not rendered at all

No new CSS classes — use the existing Aperture Noir text utility classes
consistent with the rest of the card.

## Decision Document

- `DiscSummary` is extended in place. No new type or sub-type is introduced.
- The three new fields are typed `number | null` on both backend and frontend.
  Zero is not treated as "unknown" — a film with `runtime: 0` or `tmdbRating: 0`
  would display `0 MIN` or `★ 0`, which should not happen in practice given
  TMDB data quality, but the UI must not silently swallow it.
- The `$ifNull` fallback in `listDiscs()` uses `null` (not `0` or `''`) for the
  three new fields, matching the nullable contract.
- `genres` and `directors` are intentionally excluded from `DiscSummary`.
  The disc card does not need them and keeping the list payload lean is the
  correct trade-off.
- `getCandidates()` is out of scope. It already projects `year`, `runtime`, and
  `tmdbRating` independently for the AI pipeline.
- No route-level test is added for `GET /discs`. The `discService.test.ts`
  integration test (against `mongodb-memory-server`) is the right layer for
  verifying the aggregate.

## Testing Decisions

A good test for this area asserts the external contract of `listDiscs()` — what
fields come back and with what values — not the internal shape of the aggregate
pipeline. Tests should seed real documents and assert real outputs.

**What to test:**

- `discService.test.ts`: one new test — seed a `TMDBMovie`, create a disc, call
  `listDiscs()`, assert `year`, `runtime`, and `tmdbRating` match the seeded
  values.

**What not to test:**

- The null fallback path does not need a new test. The existing `listDiscs`
  tests already exercise the no-`TMDBMovie` path implicitly.
- `DiscCard` rendering does not need a new component test. The null-safe
  rendering logic is trivial conditional JSX; the value comes from the type.
  If a `DiscCard` test is added later it should test user-visible output
  (the text "2017" appears, "164 MIN" appears), not implementation details.

**Prior art:** `discService.test.ts` — all existing tests follow the
seed → act → assert pattern against `mongodb-memory-server`. The new test
follows the same shape as `'getDisc returns the disc joined with its TMDBMovie'`.

## Out of Scope

- `getCandidates()` — already returns `year`, `runtime`, `tmdbRating`; no change.
- `getDisc()` — already returns the full `TMDBMovie`; no change.
- `genres` and `directors` on `DiscSummary` — explicitly deferred; disc card
  does not need them.
- CSS changes — the metadata row uses existing Aperture Noir utility classes.
- Route-level integration test for `GET /discs`.
- Any change to stats, mood, or decision pipeline.

## Further Notes

The `listDiscs()` aggregate currently uses `$ifNull` with empty-string fallbacks
for `posterUrl` and `title`. The new fields use `null` fallbacks instead — a
small inconsistency. Aligning `posterUrl` and `title` to also use `null`
fallbacks is a reasonable future clean-up but is out of scope here to keep the
diff minimal and the existing tests passing without modification.
