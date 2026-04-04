## Problem Statement

The barcode scanning feature was implemented as part of collection core but deferred from that feature's formal design cycle. The implementation in `AddDiscModal` and `useAddDisc` was never formally designed, leaving several error paths unspecified or silently swallowed: camera permission denial is indistinguishable from API unsupported, the post-scan loading period has no visual feedback, no default format is selected, manual barcode entry never triggers a UPC lookup, and Ionic web components make key interactions untestable in jsdom.

## Solution

Validate and correct the draft implementation by specifying a complete state machine, wiring all error paths to explicit states, and ensuring the hook is fully testable in isolation.

## User Stories

1. As a collector, I want to scan the barcode on my disc case using the device camera, so that the film lookup starts automatically without any manual input.
2. As a collector, I want to see a loading indicator immediately after a barcode is scanned, so that I know the app is looking up the disc and the camera is not frozen.
3. As a collector, I want the loading screen to have a close button, so that I can cancel a hanging lookup and try again.
4. As a collector, I want to be taken directly to the manual entry form when camera permission is denied, so that I can still add a disc without the camera.
5. As a collector, I want a clear message explaining that camera access was denied, so that I understand why I am seeing a text form instead of a camera.
6. As a collector, I want a "Enter manually" button on the camera error screen, so that I have a clear path forward when the camera is unavailable.
7. As a collector, I want the BarcodeDetector API being unsupported to surface the same camera error screen, so that both failure modes are handled identically.
8. As a collector, I want the confirm form to appear with the disc pre-populated after a successful scan, so that I can verify the match and add with minimal taps.
9. As a collector, I want to see the confirm form with an empty search field when a scanned barcode has no UPC match, so that I can search for the film manually.
10. As a collector, I want the confirm form to appear even when the UPC or TMDB lookup fails due to a network error, so that I can still add the disc manually.
11. As a collector, I want the format to default to 4K when the confirm form loads, so that I do not need to tap an extra button for the most common case.
12. As a collector, I want to type a barcode manually into the confirm form and tap a "Look Up" button, so that the UPC lookup pipeline runs the same way it does after a camera scan.
13. As a collector, I want the Look Up button to show "LOOKING UP..." and disable while the lookup is in-flight, so that I know the request is running and do not tap it twice.
14. As a collector, I want the Look Up button to pre-populate the candidate if the barcode is found in the UPC database, so that I do not have to search manually after entering a known barcode.
15. As a collector, I want the Look Up button to leave the search form empty and available if the barcode is not in the UPC database, so that I can search by title instead.
16. As a collector, I want the Look Up button to remain in the confirm form at all times without changing the page state, so that a failed lookup does not disrupt what I have already entered.
17. As a collector, I want to search for a film by title when no candidate is pre-populated, so that I can add a disc whose barcode is not in any database.
18. As a collector, I want the search button to show "SEARCHING..." while a TMDB query is in-flight, so that I know the search is running.
19. As a collector, I want to see an error message when the TMDB search fails, so that I know to check my connection and try again rather than assuming no results exist.
20. As a collector, I want to select a film from a list of TMDB search results, so that I can confirm the correct match when multiple candidates exist.
21. As a collector, I want to tap "Not the right film? Search instead" to clear an auto-populated candidate, so that I can manually search when the UPC lookup returned the wrong film.
22. As a collector, I want to select the disc format (4K, Blu-ray, DVD) before confirming, so that the physical medium is recorded accurately.
23. As a collector, I want the ADD TO COLLECTION button to remain disabled until both a candidate and a format are selected, so that I cannot submit an incomplete form.
24. As a collector, I want to see a duplicate warning when I try to add a disc I already own, so that I am aware of the conflict before writing to my collection.
25. As a collector, I want to proceed past a duplicate warning with "Add anyway", so that I can own the same film on multiple formats.
26. As a collector, I want to see a success screen with "Disc added!" after confirming, so that I know the disc was saved.
27. As a collector, I want the modal to close automatically after the success screen, so that I am returned to my collection without an extra tap.
28. As a collector, I want the form to reset completely when the modal is opened, so that data from a previous add session never bleeds into a new one.

## Implementation Decisions

### State Machine

The `AddDiscState` type is updated to:

```
scan | resolving | confirm | success | camera_error
```

The existing `error` state is renamed `camera_error`. `resolving` is a new transient state.

| State          | Entered when                                                                              | Exits to                                                                                |
| -------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `scan`         | Modal opens or user cancels during `resolving`                                            | `resolving` on barcode detected; `camera_error` on permission denied or API unsupported |
| `resolving`    | Barcode captured by BarcodeDetector                                                       | `confirm` on UPC/TMDB completion or failure; `scan` on close                            |
| `confirm`      | `resolving` completes; `camera_error` "Enter manually" tapped; barcode manually submitted | `success` on POST 200; stays on 409 (duplicate) or 5xx (error)                          |
| `success`      | POST returns 200                                                                          | modal dismisses after 1500ms                                                            |
| `camera_error` | `getUserMedia` rejected or BarcodeDetector absent                                         | `confirm` via "Enter manually" CTA                                                      |

### useAddDisc hook interface additions

- `AddDiscState` — rename `error` to `camera_error`; add `resolving`
- `isLookingUp: boolean` — true while the Look Up button's inline UPC+TMDB pipeline is in-flight
- `onLookUp: () => Promise<void>` — fires UPC lookup for the current `barcode` value; stays in `confirm`; sets candidate on hit, no-ops on miss or failure
- `onEnterManually: () => void` — transitions `camera_error` to `confirm`
- `onBarcodeDetected` — set state to `resolving` before async calls; wrap in try/catch; on any failure advance to `confirm` with null candidate (same as UPC miss)
- `onBarcodeDetectorUnsupported` — transitions to `camera_error` (was `confirm`)
- `format` default — initialise to `'4K'` instead of `null`
- `search()` catch — set `errorMessage` to "Search failed — check your connection and try again" (was: silently clear results)
- `reset()` — also resets `isLookingUp` to `false`

### AddDiscModal component changes

- New `resolving` state render: centered spinner + "Looking up disc..." + close button that calls `reset()`
- New `camera_error` state render: icon + message + "Enter manually" button that calls `onEnterManually()`
- Confirm form: add "LOOK UP" button wired to `onLookUp`; disabled and labelled "LOOKING UP..." when `isLookingUp` is true
- Replace `IonText color="warning"` duplicate warning with native `<p className="add-disc__warning">`
- Replace `IonSpinner` in search button with label text change: "SEARCHING..." when `isSearching`
- Look Up button uses the same text-label pattern: "LOOKING UP..." when `isLookingUp`

### Write semantics

No changes — add flow remains server-confirmed. The `resolving` state does not write anything.

## Testing Decisions

Tests live in `src/hooks/__tests__/useAddDisc.test.ts`, which already exists with full coverage of the original state machine. The test pattern is `renderHook` from `@testing-library/react` with `vi.stubGlobal('fetch', ...)` to control API responses.

**What makes a good test here:** assert on state transitions and exposed values (`state`, `candidate`, `barcode`, `isDuplicate`, `errorMessage`, `isLookingUp`). Do not assert on implementation details like which internal functions were called.

**Existing tests that must be updated:**

- "transitions to confirm state when BarcodeDetector is unsupported" — must now assert `camera_error`, not `confirm`
- Any test that uses `onBarcodeDetectorUnsupported()` as a shortcut to reach `confirm` state — replace with `onBarcodeDetectorUnsupported()` followed by `onEnterManually()`

**New tests required for `useAddDisc`:**

- `onBarcodeDetectorUnsupported()` transitions to `camera_error`
- `onEnterManually()` transitions from `camera_error` to `confirm`
- `onBarcodeDetected()` sets state to `resolving` synchronously before async calls complete
- `onBarcodeDetected()` network failure advances to `confirm` with null candidate (does not throw)
- `format` is `'4K'` on initial render
- `onLookUp()` with a barcode set fires UPC lookup and populates candidate on hit
- `onLookUp()` when UPC returns null: candidate is null, `isLookingUp` is false after
- `onLookUp()` on network failure: candidate is null, `isLookingUp` is false after (does not throw)
- `isLookingUp` is true while `onLookUp()` is in-flight and false after
- `search()` failure sets `errorMessage` (not just empty results)
- `reset()` resets `isLookingUp` to false

## Out of Scope

- Retry logic on UPC or TMDB failures
- Validation of barcode format (e.g. EAN-13 digit check)
- Support for barcode formats beyond EAN-13, UPC-A, UPC-E
- Torch/flashlight toggle for low-light scanning
- Scan history or recently scanned barcodes
- `AddDiscModal` component tests

## Further Notes

Design log: `docs/design-logs/05-barcode-scanning.md`

The existing `useAddDisc` tests use `onBarcodeDetectorUnsupported()` as a convenient shortcut to reach `confirm` state in several unrelated test cases (duplicate warning, POST success, POST failure). These must be updated to call `onBarcodeDetectorUnsupported()` then `onEnterManually()` after this change lands, since `onBarcodeDetectorUnsupported()` will no longer advance to `confirm` directly.
