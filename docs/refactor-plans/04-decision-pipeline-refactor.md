# 04 — Decision Pipeline Refactor

## Problem Statement

`useMoodStream` and `useDecisionStream` contain an identical ~55-line
NDJSON streaming loop. Both hooks fetch from their respective endpoints,
acquire a `ReadableStream` reader, decode chunks into a line buffer, parse
each line as a `MoodFrame`, and dispatch to React state — with identical
error handling at each step. The only differences are the endpoint URL,
the trigger signature (`submit(input)` vs `run()`), and the presence of
`reset()` on the mood hook.

This is pure duplication. Any fix to the streaming logic — a buffering
edge case, a new frame type, a change to error handling — must be applied
twice. The duplication will grow if a third streaming feature is added.

## Solution

Extract the NDJSON streaming loop into a standalone async generator
utility, `ndjsonStream(url, options?)`, in `src/lib/`. The utility takes a
URL and optional `RequestInit`, yields `MoodFrame` values, and throws on
network errors or non-ok responses.

Both hooks are then refactored to delegate to `ndjsonStream`. Each hook's
`submit`/`run` callback becomes a tight `for await` loop over the
generator, dispatching frames to its own state — no fetch boilerplate, no
buffer management.

The utility has no React dependency and is directly testable with Vitest
without jsdom. The hooks remain the public API; callers do not change.

## Commits

**Commit 1 — test + add: `src/lib/ndjsonStream.ts` with full unit tests**

Create `src/lib/__tests__/ndjsonStream.test.ts` with all tests written
first (RED), then implement `src/lib/ndjsonStream.ts` to make them pass
(GREEN).

Tests cover:

- Yields parsed `MoodFrame` objects from a single-chunk NDJSON response
- Handles a partial buffer: a multi-frame response split across two chunks
  where the first chunk ends mid-line, assembling frames only once the
  newline arrives in the second chunk
- Throws when `fetch` rejects (network error)
- Throws when the response is non-ok (`res.ok === false`)
- Throws when `res.body` is null
- Skips malformed lines silently (invalid JSON mid-stream does not throw)

Mock strategy: `vi.stubGlobal('fetch', mockFetch)` using a helper that
returns a `Response`-shaped object with a `ReadableStream` body built from
`TextEncoder` + `ReadableStream({ start(controller) { ... } })`. Pattern
is consistent with `src/lib/__tests__/api.test.ts`.

Implementation signature:

```
async function* ndjsonStream(
  url: string,
  options?: RequestInit,
): AsyncGenerator<MoodFrame>
```

Throws on network error, non-ok status, or missing body. Silently skips
unparseable lines. The buffer-drain loop is a direct extraction from the
existing hook implementations with no logic changes.

All existing tests remain green. No hook code is touched in this commit.

---

**Commit 2 — refactor: `useMoodStream` delegates to `ndjsonStream`**

Replace the inline fetch + stream loop in `useMoodStream`'s `submit`
callback with a `for await` loop over `ndjsonStream`. Frame dispatch
(`result`, `token`, `empty`) stays identical. The `catch` block sets
`status` to `'error'` — consolidating the three separate error paths
(fetch throw, `!res.ok`, `!res.body`) into one.

The `reset` callback and all exported types are unchanged. The public
interface (`UseMoodStreamResult`) is unchanged.

All existing tests pass. No test file is modified.

---

**Commit 3 — refactor: `useDecisionStream` delegates to `ndjsonStream`**

Same treatment as commit 2. Replace the inline fetch + stream loop in
`useDecisionStream`'s `run` callback with a `for await` loop over
`ndjsonStream`. Frame dispatch and error handling follow the same pattern.

The public interface (`UseDecisionStreamResult`) is unchanged. All
existing tests pass. No test file is modified.

## Decision Document

**Utility location**

`src/lib/ndjsonStream.ts` — consistent with the project rule that pure
logic and non-AI external API interactions live in `src/lib/`. The
utility calls `fetch` and parses a stream; it is not a React hook and has
no AI logic.

**Utility yields `MoodFrame`, not `unknown`**

`MoodFrame` is the existing discriminated union type in `src/types/mood.ts`
that both hooks already consume. The utility imports and yields `MoodFrame`
directly. This avoids a generic parameter and keeps the call sites
straightforward. If a future streaming endpoint introduces different frame
shapes, a new utility or a typed overload can be added at that point — no
speculative generics now.

**Error handling consolidation**

The current hooks handle errors in three separate places: a `try/catch`
around `fetch`, an `if (!res.ok || !res.body)` guard, and an implicit
fall-through. After refactoring, the utility throws in all three cases and
the hook has a single `catch` block. The observable behaviour — `status`
becomes `'error'` — is identical; only the internal structure changes.

**Malformed line behaviour**

Invalid JSON lines in the stream are silently skipped, matching the
existing hook behaviour (`catch { /* malformed frame — skip */ }`).
This is preserved in the utility so the hooks' behaviour is unchanged
after extraction.

**`reset()` not added to `useDecisionStream`**

There is no input form in decide mode to return to. The mode toggle
handles escape back to mood mode. `run()` already transitions through
`loading` → `result`, covering the "Pick again" flow. Adding `reset()` to
`useDecisionStream` would expose a state transition with no corresponding
UI — out of scope.

**`directors[0]` for co-directed films**

Left as-is. This is a documented design trade-off from the decision
pipeline design log. The personal collection tool does not have enough
co-directed films for this to be a practical problem. Any change here
requires a grill-me session on how co-directed films should be treated,
not a refactor commit.

**No changes to hook public interfaces**

`useMoodStream` and `useDecisionStream` expose the same types and
signatures after refactoring. `WatchPage.tsx` and all component tests
are unaffected.

**No changes to `WatchPage.tsx`**

The page hosts two clearly separated mode branches and is readable as-is.
Extracting `MoodMode` and `DecideMode` sub-components would be a separate
refactor with its own justification. Out of scope here.

## Testing Decisions

**What makes a good test for `ndjsonStream`**

Tests verify the observable contract from the outside: what frames are
yielded given a mocked HTTP response, and when does the generator throw.
They do not assert on the internal buffer variable, the line-splitting
logic, or how many times the reader was called. A correct refactor of
the internals should leave every test green.

**Modules tested**

- `src/lib/__tests__/ndjsonStream.test.ts` — new test file, covers the
  full utility contract (6 behaviours listed in commit 1 above).
- No changes to existing test files. The hook refactors (commits 2 and 3)
  are validated by the already-passing `WatchPage` and `WatchPage.decide`
  test suites exercising each hook's observable behaviour.

**Prior art**

- `src/lib/__tests__/api.test.ts` — establishes the `vi.stubGlobal('fetch',
mockFetch)` pattern and the `okResponse` / `errorResponse` helper
  convention. `ndjsonStream.test.ts` follows the same structure, extending
  it with a streaming `ReadableStream` body helper.

## Out of Scope

- No changes to `scoreDecisionCandidates.ts`, `decisionPipeline.ts`,
  `streamDecisionExplanation.ts`, or any server-side file.
- No changes to `WatchPage.tsx`, `MoodResult.tsx`, or `MoodInput.tsx`.
- No changes to `useMoodStream`'s public interface or `reset()` behaviour.
- No `reset()` addition to `useDecisionStream`.
- No handling of co-directed films in the scoring function.
- No new streaming features or frame types.
- No UI changes of any kind.

## Further Notes

The partial-buffer test (chunk 1 ends mid-line) is worth writing
explicitly. The current hooks handle this correctly in production but the
behaviour has never been isolated in a test — the dev-journal entry from
2026-03-30 notes that intermediate state cannot be reliably observed in
jsdom because chunks are consumed in rapid succession. The utility test
can construct a mock `ReadableStream` that yields two chunks explicitly,
making the reassembly behaviour directly observable at the unit level for
the first time.
