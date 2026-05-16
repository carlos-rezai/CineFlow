# Plan: Desktop Phone-Frame Layout

> Source PRD: https://github.com/carlos-rezai/CineFlow/issues/32

## Architectural decisions

- **No routes, schema, or API involved** — this is a CSS-only change
- **Constraint**: all layouts are phone-frame constrained at `max-width: 430px` — do not design for wider viewports
- **CSS home**: app-shell layout concerns live in `src/App.css`
- **Design token decision**: body background (`#111111`) is infrastructure, not a design token — raw hex in the global stylesheet

---

## Phase 1: CSS phone-frame centering

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

### What to build

Add two rules to `src/App.css`. The `body` rule sets the dark background that frames the app on desktop and adds `overflow-x: hidden` as a defensive measure against accidental horizontal scroll. The `ion-app` rule caps the app at 430px, centers it horizontally, and adds a box-shadow that lifts the frame off the background. On mobile (≤ 430px) the max-width constraint is inactive and the shadow is clipped by the viewport edge — the mobile experience is unchanged.

### Acceptance criteria

- [ ] On desktop (1280px+): `ion-app` is centered at 430px, body background is visibly darker than the app surface, shadow is visible around the frame
- [ ] On mobile (390px): layout fills the full screen, no visual difference from the pre-change state
- [ ] No horizontal scrollbar appears on desktop at any viewport width
- [ ] `IonFab`, `IonModal`, and `IonTabBar` remain inside the 430px frame without any component changes
- [ ] Tab bar sits at the bottom of the viewport on desktop (no dead zone)
- [ ] All 123 existing tests continue to pass
