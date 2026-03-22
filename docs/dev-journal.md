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
