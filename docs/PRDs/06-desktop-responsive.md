# PRD 06 — Desktop Phone-Frame Layout

> GitHub Issue: https://github.com/carlos-rezai/CineFlow/issues/32

## Problem Statement

Portfolio visitors open the live Vercel demo on a laptop and see the app stretched to fill the full viewport width. This looks unfinished. The README previously contained a note telling viewers to use Chrome DevTools mobile emulation — a workaround that signals the problem rather than solving it. No user-facing functional requirements change; this is purely a presentation fix for the live demo.

## Solution

CSS-only phone-frame centering. Two rules added to `src/App.css` cap `ion-app` at 430px and center it horizontally, with a dark body background that frames it visually on desktop. On mobile (≤ 430px) the constraint is inactive and every existing layout is unchanged. No component changes, no media queries, no regressions.

## User Stories

1. As a recruiter, I want the live demo to look intentional when I open it on my laptop, so that I can evaluate the app without needing DevTools or a phone.
2. As a recruiter, I want to see the app presented as a phone-frame in a desktop browser, so that the mobile-first design intent is immediately obvious.
3. As a recruiter, I do not want to see a README note telling me to use DevTools emulation, so that my first impression of the demo is confident rather than apologetic.
4. As a developer, I want the phone-frame constraint to require zero component changes, so that adding it does not risk regressions across any page or modal.
5. As a developer, I want the app to still fill the full screen on real mobile viewports (≤ 430px), so that the phone-frame CSS has no effect on the real use case.
6. As a developer, I want `IonFab`, `IonModal`, and `IonTabBar` to stay inside the 430px frame without any per-component changes, so that Ionic's internal layout hierarchy handles containment automatically.
7. As a developer, I want the body background color to be visually distinct from the app surface, so that the frame boundary reads clearly and looks deliberate on desktop.
8. As a developer, I want no horizontal scrollbar to appear on desktop, so that accidental element overflow never breaks the phone-frame illusion.
9. As a developer, I want the shadow to be applied unconditionally (no media query), so that on mobile it is simply clipped by the viewport edge and causes no visible effect.
10. As a developer, I want the body background treated as infrastructure (raw hex in the global stylesheet), not as a design token, so that future theme changes do not need to account for it.
11. As a developer, I want the README updated to remove the DevTools note and replace it with a one-liner describing the intentional phone-frame design, so that the documentation reflects reality.
12. As a developer, I want `CLAUDE.md` updated with the phone-frame build status and an architectural note, so that future sessions know not to design for wider viewports.

## Implementation Decisions

**CSS changes (both in `src/App.css`)**

- Add `body { background: #111111; overflow-x: hidden; }`. The `#111111` value is chosen to sit between the app surface (`--color-background: #0a0a0a`) and the card surface (`--color-surface: #131313`) — visible contrast without visual noise. `overflow-x: hidden` is a defensive measure: if any element accidentally overflows the 430px frame the browser would show a horizontal scrollbar on the body, which would look broken.
- Add `ion-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(0,0,0,0.6); }`. The shadow lifts the frame off the body background without a visible border. On mobile viewports the shadow is clipped by the viewport edge and is effectively invisible.
- No `max-height` is added — Ionic fills available height by default, landing the tab bar at the bottom of the viewport. A max-height would leave a dead zone below the tab bar.
- No media query is needed — `max-width: 430px` is inactive on mobile naturally.

**Containment — no component changes required**

- `IonFab` with `slot="fixed"` positions relative to `IonContent`, not the viewport — stays within the 430px frame automatically.
- `IonModal` renders inside `ion-app` and inherits its width constraint.
- `IonTabBar` is a child of `IonTabs` / `IonApp` — same.

**Docs changes**

- `README.md`: Remove the mobile emulation note. Replace with a one-liner explaining the intentional phone-frame design. Add "Desktop phone-frame layout" to the build status table.
- `CLAUDE.md`: Add "Desktop phone-frame layout" to the build status checklist. Add one-liner architectural constraint: all layouts are phone-frame constrained at `max-width: 430px` — do not design for wider viewports.

**Design token decision**

- Body background (`#111111`) is NOT added as a design token. It is infrastructure — the frame around the app, not part of the app's color system. A raw hex value in the global stylesheet is honest about what it is.

## Testing Decisions

This feature is pure CSS with no business logic, no new hooks, and no component changes. Unit tests are not applicable.

**What makes a good test for this feature:** Visual verification that:

- On desktop (1280px+): `ion-app` is centered, shadow is visible, tab bar sits at the bottom of the viewport.
- On mobile (390px): layout fills the screen, no visible difference from the pre-change state.

**Test approach:** Manual visual verification in both viewport widths. The existing Vitest + testing-library suite must continue to pass without modification — it is the regression check.

No new test files are required.

## Out of Scope

- True responsive layout: multi-column grids, sidebar navigation, adaptive typography, breakpoint-driven component restructuring. This project demonstrates AI workflow and engineering, not responsive design engineering.
- Max-height enforcement to simulate phone proportions — leaves a dead zone below the tab bar with no benefit.
- Breakpoint-triggered centering — unnecessary; `max-width: 430px` handles all viewports without a media query.
- Any component-level changes for containment — Ionic's layout hierarchy handles this automatically.

## Further Notes

- The 430px max-width matches the widest common iPhone viewport (iPhone Pro Max). On all real mobile devices the constraint is inactive.
- This is a two-rule CSS change. It works immediately across all pages, modals, routes, and the FAB with no per-page adjustment.
- The approach is deliberately minimal: portfolio-first goal, zero regressions, ships in one commit.
