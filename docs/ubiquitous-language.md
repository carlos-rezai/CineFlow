# Ubiquitous Language

## Physical Collection

| Term           | Definition                                                                      | Aliases to avoid          |
| -------------- | ------------------------------------------------------------------------------- | ------------------------- |
| **Disc**       | A single physical movie disc owned by the user, with its own barcode and format | Movie, film, item, media  |
| **Collection** | The full set of Discs owned by the user                                         | Library, catalogue, vault |
| **Format**     | The physical standard of a Disc: 4K, Blu-ray, or DVD                            | Type, edition, version    |
| **Barcode**    | The UPC code printed on a Disc case, used to identify the physical object       | UPC, code, scan           |

## Metadata

| Term           | Definition                                                                        | Aliases to avoid            |
| -------------- | --------------------------------------------------------------------------------- | --------------------------- |
| **TMDBMovie**  | A cached subset of TMDB metadata for a film, shared across all Discs of that film | Movie, film, metadata, TMDB |
| **tmdbId**     | The numeric identifier from TMDB that uniquely identifies a film                  | movieId, filmId, id         |
| **posterUrl**  | The full URL to a film's poster image as cached from TMDB                         | image, thumbnail, poster    |
| **tmdbRating** | The audience rating (0–10) sourced from TMDB — context only, not used for ranking | score, rating               |
| **cachedAt**   | The ISO date when a TMDBMovie document was last fetched from TMDB                 | updatedAt, fetchedAt        |

## User State

| Term              | Definition                                                                       | Aliases to avoid        |
| ----------------- | -------------------------------------------------------------------------------- | ----------------------- |
| **watched**       | Boolean flag on a Disc indicating whether the user has seen this disc            | seen, viewed, played    |
| **watchCount**    | The number of times the user has marked a Disc as watched                        | plays, views, rewatches |
| **lastWatchedAt** | The ISO date when the user most recently marked a Disc as watched                | watchedOn, viewedAt     |
| **rating**        | The user's personal 1–5 star score for a Disc, nullable                          | stars, score, review    |
| **notes**         | Short free-text the user attaches to a Disc (e.g. "steelbook edition"), nullable | comment, description    |

## Add Flow

| Term              | Definition                                                                                     | Aliases to avoid              |
| ----------------- | ---------------------------------------------------------------------------------------------- | ----------------------------- |
| **Scan**          | The act of capturing a barcode using the device camera via the BarcodeDetector API             | Read, detect, capture         |
| **UPC lookup**    | A call to a third-party UPC API that attempts to resolve a barcode to a film title string      | Barcode lookup, UPC search    |
| **TMDB search**   | A proxied call to the TMDB search API that returns a list of TmdbCandidates for a title string | Movie search, film search     |
| **TmdbCandidate** | A lightweight result from a TMDB search: tmdbId, title, year, posterUrl — not yet a TMDBMovie  | Result, match, suggestion     |
| **Confirm**       | The step where the user selects and approves a TmdbCandidate before a Disc is saved            | Accept, approve, verify       |
| **Duplicate**     | A second Disc document with the same barcode as an existing Disc in the Collection             | Copy, repeat, duplicate entry |

## Collection Intelligence (new)

| Term                        | Definition                                                                                                                | Aliases to avoid                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **CollectionStats**         | A pre-computed aggregate snapshot of the entire Collection, served by GET /api/stats                                      | Summary, metrics, analytics            |
| **totalWatchCount**         | The sum of all Disc.watchCount values across the Collection — not the count of Discs where watched=true                   | watchedCount, total watches            |
| **unwatchedRuntimeMinutes** | The total runtime in minutes of all Discs where watched=false, summed via TMDBMovie.runtime                               | unwatched time, remaining runtime      |
| **averageRating**           | The mean of all non-null Disc.rating values across the Collection, rounded to 1 decimal; null if none rated               | overall rating, collection score       |
| **formatBreakdown**         | A count of Discs grouped by Format (4K, Blu-ray, DVD)                                                                     | format split, format distribution      |
| **DirectorStat**            | An aggregate of all Discs sharing a director name: discCount, watchedCount, and titles owned                              | director summary, director group       |
| **GenreStat**               | A genre name paired with the count of Discs whose TMDBMovie lists that genre                                              | genre count, genre summary             |
| **director completion**     | The count of Discs owned for a given director — owned-only, no comparison against their full filmography                  | filmography completion, director score |
| **refreshToken**            | An integer counter passed to useStats that triggers a re-fetch when it changes; sourced from useCollection's fetchVersion | cache key, refresh flag                |

## Mood Engine (new)

| Term                  | Definition                                                                                                                                  | Aliases to avoid                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **MoodInput**         | The user's watch intent expressed as a combination of selected MoodTags and optional free text                                              | mood query, mood request, search       |
| **MoodTag**           | A preset label representing a watch context or emotion; one of eight locked values used to prime Gemini's attribute extraction              | tag, label, preset, category           |
| **MoodAttributes**    | A structured representation of watch intent extracted by Gemini from a MoodInput: genre weights, runtime preference, and rewatch preference | mood profile, intent, attributes       |
| **genre weight**      | A float (0–1) representing how strongly a genre aligns with a MoodInput; produced by Gemini as part of MoodAttributes                       | genre score, genre relevance           |
| **runtimePreference** | A discrete axis of MoodAttributes: 'short' (< 100 min), 'any', or 'long' (≥ 150 min)                                                        | runtime filter, length preference      |
| **preferUnwatched**   | A boolean axis of MoodAttributes indicating whether to restrict candidates to Discs where watched=false                                     | unwatched filter, new only             |
| **MoodCandidate**     | A joined Disc+TMDBMovie document eligible for mood scoring: runtime known AND genres non-empty                                              | candidate, eligible disc, scored disc  |
| **candidate pool**    | The set of MoodCandidates available for scoring after data-quality filtering; further narrowed by preferUnwatched if true                   | eligible set, scoring pool             |
| **genreScore**        | The sum of genre weights for all genres a MoodCandidate shares with MoodAttributes                                                          | genre match score, genre alignment     |
| **runtimeBonus**      | A fixed additive score (0.5) applied when a MoodCandidate's runtime fits the runtimePreference                                              | runtime score, runtime match           |
| **topPick**           | The highest-scored MoodCandidate after applying the full scoring formula                                                                    | recommendation, top result, winner     |
| **runner**            | A high-scored MoodCandidate that is not the topPick; up to 3 runners are returned as alternatives                                           | alternative, suggestion, second choice |
| **MoodResult**        | The complete output of the mood pipeline: topPick, up to 3 runners, and a streamed explanation for the topPick                              | mood response, recommendation result   |
| **explanation**       | A 2–3 sentence AI-generated string streamed for the topPick, written conversationally and referencing the original MoodInput                | summary, description, reasoning        |
| **Watch tab**         | The top-level navigation tab at `/watch` that hosts the mood engine now and the decision pipeline in Phase 4                                | Mood tab, recommendation tab           |

## People

| Term     | Definition                         | Aliases to avoid  |
| -------- | ---------------------------------- | ----------------- |
| **User** | The person who owns the Collection | Customer, account |

---

## Relationships

- A **Disc** belongs to exactly one **User**
- A **Disc** references exactly one **TMDBMovie** via **tmdbId**
- A **TMDBMovie** may be referenced by many **Discs**
- A **Duplicate** is two **Discs** with the same **barcode** — this is valid and intentional
- A **Disc** lifecycle begins at **Confirm**, not at **Scan**
- **CollectionStats** aggregates all **Discs** and their linked **TMDBMovies** in a single pass
- A **DirectorStat** groups all **Discs** whose **TMDBMovie** lists that director's name
- **totalWatchCount** is the sum of **watchCount** across all **Discs** — not the count of **watched=true** Discs
- A **MoodInput** contains zero or more **MoodTags** and optional free text — both are sent to Gemini together
- **MoodAttributes** is always produced by Gemini from a **MoodInput** — never constructed manually
- The **candidate pool** is all **MoodCandidates** where `runtime` is known AND `genres` is non-empty; further filtered to unwatched-only if `preferUnwatched` is true
- A **topPick** is selected deterministically by the scoring formula — Gemini does not choose it
- **runners** are the next highest-scored **MoodCandidates** after the **topPick**; up to 3, returned without an AI explanation
- The **explanation** is streamed only for the **topPick** — runners receive no AI explanation

---

## Example dialogue

> **Dev:** "When a **User** scans a barcode, do we create a **Disc** immediately?"
> **Domain expert:** "No — a **Disc** is only created after the **User** confirms a **TmdbCandidate**. The **barcode** is captured at **Scan** time but the **Disc** document is not written until **Confirm**."

> **Dev:** "What if the **UPC lookup** returns nothing?"
> **Domain expert:** "Fall back to **TMDB search** silently — the **User** types a title and picks a **TmdbCandidate** manually. The **barcode** is still stored on the **Disc** either way."

> **Dev:** "If the **User** owns _Blade Runner 2049_ on 4K and Blu-ray, how many **Discs** exist?"
> **Domain expert:** "Two **Discs**, one per physical object, both referencing the same **TMDBMovie** by **tmdbId**. The **TMDBMovie** is shared — it is never duplicated."

> **Dev:** "If I mark a **Disc** as watched twice, what happens to **watchCount**?"
> **Domain expert:** "It increments to 2, and **lastWatchedAt** updates. The **watched** boolean stays true. If the **User** then marks it unwatched, **watched** flips to false but **watchCount** and **lastWatchedAt** are preserved — they are append-only in spirit."

> **Dev:** "In **CollectionStats**, is **totalWatchCount** the number of Discs the user has watched?"
> **Domain expert:** "No — it is the sum of every Disc's **watchCount**. A Disc watched three times contributes 3. A Disc never watched contributes 0. It measures total viewing events, not unique Discs watched."

> **Dev:** "What does **director completion** mean — does it compare against a director's full filmography?"
> **Domain expert:** "No. **Director completion** is owned-only: it counts how many Discs in the Collection share a director's name. There is no comparison against films the User does not own. That is a shopping feature, not a watch feature."

> **Dev:** "If the User selects 'Intense' and 'Quick Watch', does the mood engine filter to Action films under 100 minutes?"
> **Domain expert:** "Not exactly. The **MoodTags** are sent to Gemini, which produces **MoodAttributes** — genre weights and a **runtimePreference**. The **candidate pool** is then scored using those weights plus a **runtimeBonus**. Gemini interprets the tags; it doesn't hard-filter by them."

> **Dev:** "If the User says preferUnwatched but only two unwatched Discs match, do we pad with watched Discs?"
> **Domain expert:** "No. **preferUnwatched** is a hard filter — we never silently relax it. Return the two matches as **topPick** and one **runner**. If zero unwatched Discs match, return the empty state."

> **Dev:** "Does Gemini pick the topPick?"
> **Domain expert:** "No. Gemini produces **MoodAttributes** and streams the **explanation**. The **topPick** is chosen by the deterministic scoring formula: **genreScore** plus **runtimeBonus**. Gemini explains the choice it did not make."

---

## Flagged ambiguities

- **"movie" / "film"** — used interchangeably in conversation. Canonical term is **TMDBMovie** for the cached metadata document. Use **film** only in plain English descriptions. Never use either as a synonym for **Disc**.
- **"rating"** — appears in two contexts: the user's personal **rating** (1–5 stars on a Disc) and **tmdbRating** (0–10 from TMDB on a TMDBMovie). Always qualify which rating is meant. Never use "rating" alone in code or data model.
- **"watched count"** — potentially ambiguous. **watchedCount** in **CollectionStats** means the number of Discs where `watched=true`. **totalWatchCount** means the sum of all `disc.watchCount` values. Never use "watched count" without the full qualified term.
- **"recommendation"** — avoid as a standalone term. The output of the mood engine is a **MoodResult** containing a **topPick** and **runners**. "Recommendation" is acceptable in plain English UX copy but not in code or data model naming.
- **"score"** — used in two senses: **genreScore** (the genre-weight component) and the overall disc score (`genreScore + runtimeBonus`). Always qualify which is meant. The overall score has no canonical name — refer to it as "the scoring formula result" or use the formula directly.
