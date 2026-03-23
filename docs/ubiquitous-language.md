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

---

## Flagged ambiguities

- **"movie" / "film"** — used interchangeably in conversation. Canonical term is **TMDBMovie** for the cached metadata document. Use **film** only in plain English descriptions. Never use either as a synonym for **Disc**.
- **"rating"** — appears in two contexts: the user's personal **rating** (1–5 stars on a Disc) and **tmdbRating** (0–10 from TMDB on a TMDBMovie). Always qualify which rating is meant. Never use "rating" alone in code or data model.
- **"watched count"** — potentially ambiguous. **watchedCount** in **CollectionStats** means the number of Discs where `watched=true`. **totalWatchCount** means the sum of all `disc.watchCount` values. Never use "watched count" without the full qualified term.
