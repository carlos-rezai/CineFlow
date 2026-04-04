# Plan: Barcode Scanning

> Source PRD: https://github.com/carlos-rezai/CineFlow/issues/28

## Architectural decisions

- **No new routes** — existing `/api/upc/:barcode` and `/api/tmdb/search` routes are unchanged
- **No schema changes** — this is a purely frontend change; no Disc or TMDBMovie fields are modified
- **State machine** — `AddDiscState` union type drives all rendering; the component is a thin renderer over the hook's state
- **Deep module** — all logic lives in `useAddDisc`; `AddDiscModal` contains no business logic

---

## Phase 1: State machine — `camera_error` and `resolving`

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 28

### What to build

Restructure the state machine so both camera failure modes (permission denied and API unsupported) route to a named `camera_error` state with a visible message and "Enter manually" CTA, and so the post-scan loading period is represented by a distinct `resolving` state rather than a frozen scan screen.

In the hook: rename the unused `error` state to `camera_error`. Add `resolving` to the type. `onBarcodeDetectorUnsupported` transitions to `camera_error` (previously `confirm`). Add `onEnterManually` which transitions `camera_error` → `confirm`. `onBarcodeDetected` sets state to `resolving` before firing async calls, wraps the UPC + TMDB pipeline in try/catch, and advances to `confirm` with null candidate on any network failure — identical to a UPC miss.

In the component: add a `camera_error` render (icon, message, "Enter manually" button) and a `resolving` render (centered spinner, "Looking up disc…", close button that calls `reset()` which returns to `scan`).

Update the existing test suite: `onBarcodeDetectorUnsupported` now asserts `camera_error` not `confirm`; tests that use it as a shortcut to reach `confirm` are updated to call `onBarcodeDetectorUnsupported` then `onEnterManually`.

### Acceptance criteria

- [ ] `onBarcodeDetectorUnsupported()` transitions state to `camera_error`
- [ ] `onEnterManually()` transitions state from `camera_error` to `confirm`
- [ ] `onBarcodeDetected()` transitions state to `resolving` before async calls complete
- [ ] `onBarcodeDetected()` network failure advances to `confirm` with null candidate and does not throw
- [ ] Component renders `camera_error` screen with message and "Enter manually" CTA
- [ ] Component renders `resolving` screen with spinner, "Looking up disc…", and close button
- [ ] Close button in `resolving` calls `reset()` and returns to `scan`
- [ ] All previously passing `useAddDisc` tests continue to pass with updated state assertions

---

## Phase 2: Confirm form — Look Up, format default, error messages, native elements

**User stories**: 11, 12, 13, 14, 15, 16, 18, 19

### What to build

Four independent improvements to the confirm form, delivered together as they all touch the same hook interface and component render.

**Format default**: `format` initialises to `'4K'` instead of `null`. The 4K button in the format selector is pre-selected when the confirm form loads.

**Look Up button**: Add `onLookUp` and `isLookingUp` to the hook. `onLookUp` fires the UPC → TMDB pipeline for the current `barcode` value, stays in `confirm` throughout, sets candidate on hit, and no-ops on miss or failure. `isLookingUp` is true while the call is in-flight and false after. The confirm form gains a "LOOK UP" button wired to `onLookUp`; it is disabled and relabelled "LOOKING UP…" when `isLookingUp` is true.

**Search error message**: `search()` catch sets `errorMessage` to "Search failed — check your connection and try again" instead of silently clearing results.

**Native elements**: Replace `IonText color="warning"` with a native `<p>` carrying a CSS class. Replace `IonSpinner` in the search button with a text label change to "SEARCHING…". The Look Up button follows the same text-label pattern.

### Acceptance criteria

- [ ] `format` is `'4K'` on initial render
- [ ] `onLookUp()` with a barcode set fires UPC lookup and populates candidate on hit
- [ ] `onLookUp()` when UPC returns null: candidate is null, `isLookingUp` is false after
- [ ] `onLookUp()` on network failure: candidate is null, `isLookingUp` is false after, does not throw
- [ ] `isLookingUp` is true while `onLookUp()` is in-flight and false after
- [ ] `search()` failure sets `errorMessage` (not just empty results)
- [ ] `reset()` resets `isLookingUp` to false
- [ ] No `IonText` or `IonSpinner` in `AddDiscModal`
- [ ] Duplicate warning renders as a native element assertable in jsdom
