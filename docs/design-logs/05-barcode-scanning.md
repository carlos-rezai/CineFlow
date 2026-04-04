# 05 — Barcode Scanning

## Background

The barcode scanning feature was implemented as part of collection core but
explicitly deferred from that feature's formal design cycle. The implementation
in `AddDiscModal` and `useAddDisc` was treated as a draft. This session
validates and specs that draft — identifying gaps, missing error states, and
anything that needs to be corrected before the feature is considered properly
designed and testable.

---

## Problem

The draft implementation had several unspecified error paths and missing
design decisions: camera permission denial was silently swallowed, the
post-scan loading period had no visual feedback, no format default was set,
manual barcode entry never triggered a UPC lookup, and Ionic web components
made key interactions untestable in jsdom.

---

## Questions and Answers

**Q1: What is the scope of this session?**
Validate and spec the existing implementation. Treat what's there as a
draft. Identify gaps, missing error states, and corrections needed before
it can be formally tested.

**Q2: How should camera permission denial be surfaced?**
A distinct `camera_error` state with an icon, message, and "Enter manually"
CTA. Both permission denied (`getUserMedia` rejection) and BarcodeDetector
API unsupported route to this state. The existing `error` AddDiscState is
renamed `camera_error`. Silent fallback was the bug — the user had no idea
why they were looking at a text form instead of a camera.

**Q3: What does the user see between barcode detected and confirm state?**
A new `resolving` state replaces the video frame with a centered spinner
and "Looking up disc…". The close button remains — tapping it cancels
in-flight requests and resets to `scan`. A network failure during UPC or
TMDB lookup silently advances to `confirm` with no candidate, identical
to a UPC miss. The previous behaviour (frozen black frame, no feedback)
was unacceptable.

**Q4: What happens when UPC lookup or TMDB search fails during resolving?**
Advance to `confirm` with no candidate — same as a UPC miss. Network
failures are indistinguishable from "barcode not in database" from the
user's perspective. The path forward is identical: manual search.

**Q5: Should a format be pre-selected when the confirm form loads?**
Yes — `'4K'` is the default. CineFlow is a 4K disc collection manager.
Requiring an extra tap for every disc add is friction with no payoff.
The user overrides if needed.

**Q6: Should manually entering a barcode trigger UPC lookup?**
Via an explicit "Look Up" button next to the barcode field. Tapping it
fires the UPC → TMDB pipeline inline and populates a candidate if found.
Auto-trigger on blur was too surprising on mobile. No lookup at all made
the barcode field functionally useless. The button mirrors the scan flow:
scan detects → lookup fires.

**Q7: How should a failed TMDB search be surfaced?**
Reuse the existing `errorMessage` state: "Search failed — check your
connection and try again." A separate `searchError` state would be
over-engineering for one failure case.

**Q8: Should IonText and IonSpinner be replaced with native elements?**
Yes. `IonText color="warning"` becomes `<p className="add-disc__warning">`.
`IonSpinner` in the search button becomes a label text change to
"SEARCHING…". Consistent with the project pattern: Stencil web components
break `toBeDisabled()` and `aria-*` assertions in jsdom.

**Q9: Is auto-selecting candidates[0] after a UPC hit the correct behaviour?**
Yes. UPC lookup is accurate for commercial releases. The "Not the right
film? Search instead" rejection link handles the edge case. Requiring
explicit selection on every scan adds friction to the happy path.

**Q10: Can the user cancel during resolving state?**
Yes — the close button is present and resets to `scan`. The resolving
state replaces the scan screen and should inherit its close button. If
UPCitemdb hangs, the user needs an escape hatch.

**Q11: Does the Look Up button transition through resolving state?**
No — inline loading within `confirm`. The `resolving` state is for the
scan-to-confirm transition only. Inside the confirm form, loading stays
in-place. A separate `isLookingUp` boolean (distinct from `isSearching`)
controls the disabled state and label change: "LOOK UP" → "LOOKING UP…"
while in-flight. State stays `confirm` throughout.

---

## Decisions

### State Machine

```
scan | resolving | confirm | success | camera_error
```

| State          | Description                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| `scan`         | Camera active, BarcodeDetector loop running, close button present                |
| `resolving`    | Barcode captured, UPC + TMDB calls in-flight; spinner + "Looking up disc…"       |
| `confirm`      | Form: barcode + Look Up, candidate or manual search, format selector             |
| `success`      | Checkmark + "Disc added!", auto-closes after 1500ms                              |
| `camera_error` | Permission denied or API unsupported; message + "Enter manually" CTA → `confirm` |

The existing `error` AddDiscState is renamed `camera_error`.

### Error Handling

- `getUserMedia` rejection → `camera_error` (was: silent `confirm`)
- BarcodeDetector unsupported → `camera_error` (was: silent `confirm`)
- UPC or TMDB network failure during `resolving` → `confirm` with no candidate (silent, same as UPC miss)
- TMDB search failure → `errorMessage`: "Search failed — check your connection and try again"
- Duplicate on POST → existing 409 flow unchanged

### Form Defaults

- `format` defaults to `'4K'` when confirm form loads

### Look Up Button

- Explicit "LOOK UP" button in confirm form, beside the barcode input
- Fires UPC → TMDB lookup inline (does not change state)
- `isLookingUp` boolean, separate from `isSearching`
- Label: "LOOK UP" → "LOOKING UP…" while in-flight, button disabled
- On hit: populates candidate (same as post-scan auto-select, candidates[0])
- On miss or failure: no candidate populated, user proceeds to manual search

### Native Elements

- `IonText color="warning"` → `<p className="add-disc__warning">`
- `IonSpinner` in search button → label text "SEARCHING…"
- Look Up button uses "LOOKING UP…" same pattern

### Confirmed As-Is

- Auto-select `candidates[0]` after UPC hit; rejection link stays
- `onBarcodeDetected` network failure → silent fallback to `confirm` with no candidate
- Duplicate warning and "add anyway?" flow unchanged
- `onCandidateSelected` clears `searchResults`
- Success state auto-closes after 1500ms

---

## Out of Scope

- Retry logic on UPC or TMDB failures
- Validation of barcode format (e.g. EAN-13 digit check)
- Multiple barcode format support beyond ean_13, upc_a, upc_e
- Torch/flashlight toggle for low-light scanning
- Scan history or recently scanned barcodes
