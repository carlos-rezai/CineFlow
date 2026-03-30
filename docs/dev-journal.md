# Dev Journal

## 2026-03-21

- You can update a skill mid-session if the changes are additive.
  Tell Claude Code to re-read the relevant SKILL.md files before
  continuing. Behavioural or structural changes need a fresh session.

- git add warnings about LF/CRLF on Windows are safe to ignore.
  .gitattributes handles normalisation server-side.

- write-a-prd reads the design log automatically now — no need to
  paste context manually at the start of the session.

- Fresh session is better than --continue when starting a new
  workflow step. Resume is for interrupted builds.

## 2026-03-22

- Ionic v8 + React 19: `aria-hidden` warning on modal open/close is a
  known upstream issue. Ionic v8 web components set `aria-hidden` on
  the host element during animation; React 19's stricter accessibility
  checks surface this as a console warning. Not a functional bug.
  Defer to refactor phase — track as a cleanup item rather than a
  build blocker. Do not suppress with eslint-disable or workarounds
  until Ionic releases a fix.

- mongodb-memory-server works fine standalone but times out when
  Vitest runs multiple test files in parallel on Windows. Fix:
  `fileParallelism: false` in `server/vitest.config.ts`.
  `poolOptions` API no longer exists in Vitest 4 — use
  `fileParallelism` instead.

- Husky pre-commit runs the root Vitest which picked up server tests.
  Fix: add `exclude: ['**/server/**']` to root `vitest.config.ts` so
  server tests only run from `server/` with their own config.

- dotenv must be imported as the very first line in
  `server/src/index.ts` — before any other imports. If it loads after
  MongoDB client initialisation, `process.env.MONGODB_URI` is
  undefined and the connection string is invalid.

- MongoDB Atlas connection string must include the database name before
  the `?`. Format: `mongodb+srv://user:pass@cluster.mongodb.net/cineflow?...`
  Without `/cineflow` the driver cannot resolve the connection.

- CORS must be configured in Express before any routes. Install `cors`
  and `@types/cors` in `server/`, add `app.use(cors({ origin: 'http://localhost:5173' }))`
  before `app.use(express.json())`.

- Vite proxy is the most reliable way to forward API calls in
  development. Add to `vite.config.ts`:
  `server: { proxy: { '/api': 'http://localhost:3001' } }`
  This works regardless of whether `VITE_API_BASE_URL` is used
  correctly in hooks.

- Ionic v8 + React 19: `onIonInput` on `IonInput` doesn't reliably
  sync to React state due to web component controlled input friction.
  Fix: replace `IonInput` with native `<input>` using React's
  `onChange` for any controlled input that needs reliable state sync.
  Watch for this pattern whenever an IonInput value isn't updating.

- useCollection refresh infinite loop: any function passed as a
  dependency to `useEffect` must be wrapped in `useCallback` to
  prevent infinite re-render loops. Hit twice — issues #6 and #7.
  Rule: every callback passed between hooks must be `useCallback`.

- useCollection stale filter after navigation: `refresh` defined in a
  closure captures the filter value at creation time, not the current
  value. Fix: ensure `refresh` in `useCollection` reads the current
  `filter` from state when building the fetch URL, not a stale closure.
  Also use `useIonViewWillEnter` to re-fetch when navigating back to
  `CollectionPage`.

- Race condition on collection refresh: two concurrent fetches can
  resolve out of order. Fix: version counter — increment on every
  fetch, only apply results from the latest version. Prevents stale
  data overwriting fresh data when the user navigates back.

- Build skill: `gh issue close` command sometimes gets printed instead
  of executed by CC. Check GitHub issues board after every build
  approval and close manually if needed with:
  `gh issue close <n> --comment "Implemented and reviewed. All ACs passing."`

- UI polish deferred: collection grid cards and detail page need
  styling work — poster sizing, spacing, watched overlay, format badge.
  Deferred to refactor phase after all collection-core issues closed.

- Camera scanning deferred: BarcodeDetector API implementation removed
  from issue #6 scope. Needs its own grill-me → PRD → plan → issues
  cycle. Key questions: browser support strategy, HTTPS requirement,
  Capacitor native camera as PWA alternative.

## 2026-03-23

- `fetchVersion` inside `useCollection` is a `useRef` — refs don't
  trigger re-renders, so passing `fetchVersion.current` as a prop to
  a second hook would be stale. Fix: mirror it as a `useState(0)`
  counter (`refreshToken`) exposed in `UseCollectionResult`. Same
  value as `fetchVersion`, but React-reactive. Pattern to follow
  whenever a ref needs to propagate as a dependency to another hook.

- `totalWatchCount` in the stats aggregation is the sum of all
  `disc.watchCount` values — NOT the count of discs where
  `watched: true`. These are different numbers. Easy to implement
  incorrectly. Always verify the aggregation field name and intent
  are aligned.

- Stats endpoint designed to serve two consumers from day one: the UI
  (CollectionPage summary section) and the AI pipeline (Phase 4 calls
  `/api/stats` directly with no rework). When designing a data
  endpoint, ask early whether the AI pipeline will need it — shapes
  the payload richness decision.

- Director completion is owned-only — no TMDB filmography lookup.
  Full list returned by the API; UI filters to `discCount ≥ 2` for
  display. Full "how many are you missing" comparison is a different
  feature with its own complexity. Deferred.

- `gh issue create` with multi-line markdown bodies containing `#`
  headers breaks shell quoting — the shell interprets `#` as a comment
  character and truncates the body. Fix: write the issue body to a
  temp file first, then use `--body-file /tmp/issue-body.md` instead
  of passing the body inline. Use this pattern for all issue creation
  going forward.

## 2026-03-24

- `@testing-library/jest-dom` works with Vitest despite the name — it
  is not jest-specific. Add `import '@testing-library/jest-dom'` to a
  setup file (`src/test-setup.ts`) and register it via `setupFiles` in
  `vitest.config.ts`. Gives access to DOM matchers like
  `toBeInTheDocument` and `toHaveTextContent` in all component tests.
  One-time config change, applies to every component test in the project.

- `afterEach(cleanup)` must be explicit in component tests when using
  `@testing-library/react`. Without it, rendered components stack
  between tests and cause false positives or interference. Add it to
  every component test file.

- The orthodox TDD approach (Martin Fowler / Kent Beck) runs a full
  RED→GREEN loop per behaviour — write one test, make it pass, repeat.
  The CineFlow workflow separates `/tdd` and `/build` intentionally to
  keep a human review gate between specification and implementation.
  Updated the tdd skill to stop at RED — write all failing tests,
  confirm they fail for the right reasons, then hand off to `/build`.
  Both approaches are valid; the separation is a workflow choice, not
  a TDD correctness issue.

- `fetchVersion` inside `useCollection` is a `useRef` — refs don't
  trigger re-renders, so passing `fetchVersion.current` as a prop to
  a second hook would be stale. Fix: mirror it as a `useState(0)`
  counter (`refreshToken`) exposed in `UseCollectionResult`. Same
  value as `fetchVersion`, but React-reactive. Pattern to follow
  whenever a ref needs to propagate as a dependency to another hook.

- `totalWatchCount` in the stats aggregation is the sum of all
  `disc.watchCount` values — NOT the count of discs where
  `watched: true`. These are different numbers. Easy to implement
  incorrectly. Always verify the aggregation field name and intent
  are aligned.

- `gh issue create` with multi-line markdown bodies containing `#`
  headers breaks shell quoting — the shell interprets `#` as a comment
  character and truncates the body. Fix: write the issue body to a
  temp file first, then use `--body-file /tmp/issue-body.md` instead
  of passing the body inline. Use this pattern for all issue creation
  going forward.

- `request-refactor-plan` skill does not always close the parent PRD
  issue automatically — CC sometimes skips it. Check GitHub after
  every refactor plan is filed and close the parent manually if needed:
  `gh issue close <n> --comment "Feature complete — refactor planned in #<n>."`

- Initialising `refreshToken` with `useState(1)` instead of
  `useState(0)` eliminates a double-fetch on mount. When initialised
  at 0, `setRefreshToken(1)` fires immediately on mount causing two
  fetches. Initialising at 1 makes the first `setRefreshToken(1)` a
  React no-op. Apply this pattern whenever a counter is used as a
  re-fetch trigger.

  ## 2026-03-25

- `.claude/settings.local.json` must be in `.gitignore` but if the
  file was already tracked before being ignored, git continues to
  watch it. Fix: `git rm --cached .claude/settings.local.json` then
  commit. `.gitignore` only prevents untracked files from being
  tracked — it does not untrack files already in the index.

- GitHub issue titles should not use conventional commit prefixes
  (`feat:`, `fix:`, etc.) — that convention is for commit messages
  only. Issue titles follow the pattern:
  `[Feature Name]: [short description]`
  e.g. `Mood Engine: AI-powered watch recommendation from mood input`

- When adding `IonTabs` to an Ionic React app that previously used
  a bare `IonRouterOutlet`, the existing route structure must be
  migrated — the collection page moves from `/` to `/collection`.
  This affects navigation links, `useIonViewWillEnter` hooks, and
  back button behaviour. Treat IonTabs migration as its own dedicated
  issue in the dependency chain, not a side effect of adding a new tab.

- A tracer bullet phase that will be replaced by a subsequent issue
  should explicitly state this in its AC:
  "This is a tracer bullet only — issue #n upgrades this to [final
  behaviour]. This issue is not a finished deliverable."
  Prevents the upgrade from looking like a regression during review.

- The `ai/prompts/` and `ai/pipelines/` module patterns are
  established in the mood engine. Every subsequent AI feature follows
  the same structure. Prompts are typed functions — no inline strings,
  no `any` types. Pipelines live in `ai/pipelines/`, never in
  components or hooks.

- Gemini structured output (`responseMimeType: "application/json"` +
  `responseSchema`) guarantees valid JSON matching the schema — no
  manual JSON parsing, no fence-stripping, no try/catch around
  JSON.parse. Use this for any AI call that needs a fixed
  machine-readable output contract.

## 2026-03-26

- `GET /candidates` route must be registered before `GET /:id` in the
  discs router. Express matches routes in order — if `/:id` comes first,
  `/candidates` is swallowed by the dynamic segment and throws because
  "candidates" is not a valid ObjectId. Always register static routes
  before dynamic ones in Express routers.

## 2026-03-30

- `IonInput` is an Ionic web component custom element. In jsdom it does
  not fire standard DOM `change` events — it fires `ionInput` (a custom
  event). Tests using `fireEvent.change` against an `IonInput` have no
  effect on component state. Fix: replace `IonInput` with a native
  `<input>` for any controlled input that needs to be tested with
  `fireEvent.change`. Visually equivalent in a real browser where Ionic
  styles the native input inside the shadow DOM anyway. Same pattern
  as the `onIonInput` fix from collection-core.

- Design logs are immutable snapshots — they capture decisions made
  during the grill-me session and must not be updated during build or
  refactor. Build-phase discoveries belong in the dev-journal. If CC
  attempts to update a design log during build, revert it and redirect
  to the dev-journal.

- `hookTimeout: 120000` added to `server/vitest.config.ts` — the
  MongoDB binary needed more than the default 10s to download on first
  run. One-time fix; subsequent runs are fast once the binary is cached.

- Partial buffer handling in a TextDecoder loop: split the stream into
  two chunks where the first ends mid-JSON-line. Assert that after the
  full stream completes the fragment was correctly reassembled. The
  intermediate state (after chunk 1, before chunk 2) cannot be reliably
  observed in jsdom because enqueued chunks are consumed in rapid
  succession. Final-state assertion is sufficient to guard the behaviour.
