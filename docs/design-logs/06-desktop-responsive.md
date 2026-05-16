# 06 — Desktop Phone-Frame Layout

## Background

CineFlow is a mobile-first PWA built with Ionic React. All layouts were
designed for 390–430px viewports with no media queries, no max-widths, and
no responsive breakpoints. On desktop the app stretches to fill the full
viewport width, which reads as unfinished. The live README included a note
telling viewers to use Chrome DevTools mobile emulation — a workaround that
signals the problem rather than solving it.

---

## Problem

Portfolio visitors open the live Vercel demo on a laptop and see a full-width
stretched UI. The README note compounds the problem: telling recruiters to
use DevTools emulation admits the app isn't desktop-ready. The app needs to
look intentional on desktop without restructuring any layouts.

---

## Questions and Answers

**Q1: What is the primary driver?**
Portfolio-first. Recruiters open the live demo on a laptop. The app must
look deliberate, not broken. No user-facing functional requirements change.

**Q2: Phone-frame or true responsive?**
Centered phone-frame. Cap the app at 430px, center it horizontally, keep
every existing layout unchanged. True responsive — multi-column grids,
sidebar nav, adaptive typography — is out of scope. This project demonstrates
AI workflow, not responsive design engineering.

**Q3: Max-width value?**
430px — the widest common iPhone viewport. On mobile (390–430px viewports)
the constraint is inactive and the app fills the screen naturally. On desktop
it centers the frame. No media query needed.

**Q4: Should max-height be added to enforce phone proportions?**
No. Adding a max-height would mean the frame doesn't fill the screen, leaving
a dead zone below the tab bar. Ionic fills available height by default — the
tab bar lands at the bottom of the viewport, which is the natural behaviour.
The phone-frame illusion comes from the width constraint alone.

**Q5: What is the body background color?**
`#111111` — slightly lighter than the app surface (`--color-background:
#0a0a0a`), darker than cards (`--color-surface: #131313`). Enough contrast
to read as an intentional frame without visual noise. Not added as a design
token — the body background is infrastructure, not a UI color. A raw hex
value in the global stylesheet is honest about what it is.

**Q6: Shadow on ion-app?**
`box-shadow: 0 0 40px rgba(0,0,0,0.6)`. Lifts the frame off the body
background without a visible border. Applied always — no media query. On
mobile viewports the shadow is clipped by the viewport edge and is
effectively invisible; this is harmless.

**Q7: Should body have overflow-x: hidden?**
Yes. If any element accidentally overflows the 430px frame horizontally,
the browser would show a horizontal scrollbar on the body — which would look
completely broken for a centered phone-frame. `overflow-x: hidden` is a
defensive one-liner with no visual downside when everything is correct.

**Q8: Where do the CSS rules live?**
Both rules (`body` and `ion-app`) go in `App.css`. That file already owns
app-shell concerns: tab bar styles targeting `.app-tab-bar` and `ion-label`.
Adding body background and ion-app frame rules there keeps all app-shell
layout in one place.

**Q9: Do IonFab, IonModal, and IonTabBar need changes?**
No. All three are children of `ion-app` or Ionic's internal layout:

- `IonFab` with `slot="fixed"` positions relative to IonContent, not the
  viewport — stays within the 430px frame automatically
- `IonModal` renders inside `ion-app` and inherits its width constraint
- `IonTabBar` is a child of `IonTabs` / `IonApp` — same

**Q10: What changes in the README?**
Remove the mobile emulation note (line 220). Replace with a one-liner
explaining the intentional phone-frame design. Add "Desktop phone-frame
layout" to the build status table.

**Q11: What changes in CLAUDE.md?**
Add "Desktop phone-frame layout" to the build status checklist. Add a
one-liner architectural constraint note so future sessions know not to design
for wider viewports.

---

## Design

✅ **Chosen approach — CSS-only phone-frame centering**

Two rules, both in `src/App.css`, zero component changes:

```css
/* src/App.css */
body {
  background: #111111;
  overflow-x: hidden;
}

ion-app {
  max-width: 430px;
  margin: 0 auto;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
}
```

Behaviour by viewport:

| Viewport          | max-width active?       | Shadow visible?    | Result      |
| ----------------- | ----------------------- | ------------------ | ----------- |
| Mobile (≤ 430px)  | No — fills naturally    | Clipped, invisible | Unchanged   |
| Desktop (> 430px) | Yes — centered at 430px | Visible            | Phone-frame |

❌ **Rejected: True responsive layout**
Would require restructuring every page — grid columns, tab bar position,
component sizing. Out of scope for a portfolio project demonstrating AI and
engineering workflow, not responsive design.

❌ **Rejected: Breakpoint-triggered centering**
Unnecessary. `max-width: 430px` handles all viewports without a media query.
A breakpoint would add complexity with zero benefit.

❌ **Rejected: max-height constraint**
Would leave a dead zone below the tab bar on desktop. Ionic's natural
full-height behaviour is correct — the phone-frame illusion needs only the
width constraint.

---

## Implementation Plan

**Phase 1 — Frame centering and background (CSS-only)**

1. Add `body { background: #111111; overflow-x: hidden; }` to `src/App.css`
2. Add `ion-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(0,0,0,0.6); }` to `src/App.css`
3. Verify on desktop (1280px+): frame is centered, shadow visible, tab bar at bottom
4. Verify on mobile (390px): layout fills screen, no visible change

**Phase 2 — Docs updates**

5. Replace mobile emulation note in `README.md` (line 220) with phone-frame one-liner
6. Add `Desktop phone-frame layout` to build status table in `README.md`
7. Add `Desktop phone-frame layout` to build status checklist in `CLAUDE.md`
8. Add architectural constraint note to `CLAUDE.md`

---

## Trade-offs

**Easier:** Zero component changes. Ships as two CSS rules. Works immediately
across all pages, modals, routes, and the FAB — no per-page adjustments.

**Harder:** Nothing — this approach has no meaningful downsides for the
stated goal.

**Explicitly ruled out of scope:** True responsive layout with adaptive grids
and navigation. Could be a future feature but is not needed to achieve the
portfolio goal. Max-height enforcement — adds dead space with no benefit.
