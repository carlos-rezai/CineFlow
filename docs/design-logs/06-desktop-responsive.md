# 06 — Desktop Responsive

## Background

CineFlow is a mobile-first PWA built with Ionic React. All layouts were
designed for ~390–430px viewports with no media queries, no max-widths,
and no responsive breakpoints. On desktop, the app stretches to full
viewport width, which looks unfinished. The live README included a note
instructing viewers to use Chrome DevTools mobile emulation — the goal
of this feature is to remove that note by making desktop look intentional.

## Problem

Portfolio visitors open the live demo on a laptop and see a 2-column
poster grid stretched across 1440px. The app reads as incomplete. The
README workaround (mobile emulation note) signals the same problem. The
app needs to look polished on desktop without restructuring any layouts.

## Questions and Answers

**Q: What is the primary driver?**
Portfolio-first. Recruiters will open the live Vercel demo on a laptop.
The app must look deliberate, not broken.

**Q: Layout strategy — phone-frame or true responsive?**
Centered phone-frame. Cap the app at 430px, center it, keep the mobile
design unchanged. True responsive (multi-column, sidebar nav) is out of
scope — the portfolio demonstrates AI workflow, not responsive design
engineering.

**Q: Max-width and centering trigger?**
430px max-width, always active. No media query needed — `max-width` +
`margin: auto` fills the screen naturally on mobile (390–430px viewport)
and centers on desktop. Zero breakpoints.

**Q: Background outside the frame?**
Body background `#111111` — slightly lighter than the app surface
(`#0a0a0a`). Provides just enough contrast to read as an intentional
frame without visual noise.

**Q: Frame edge treatment?**
Soft `box-shadow: 0 0 40px rgba(0,0,0,0.6)` on the app root. Lifts the
frame off the background without a visible border.

**Q: Modals?**
No change. Modals are already full-width within the frame and look
correct at 430px — that is what they were designed for.

## Design

✅ **Chosen approach — CSS-only phone-frame centering**

Changes are limited to two CSS rules, both global:

```css
/* index.html or global CSS */
body {
  background-color: #111111;
}

/* Applied to ion-app or #root */
max-width: 430px;
margin: 0 auto;
box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
```

File locations:

- `src/theme/variables.css` — add body background token if needed
- `src/App.css` — apply max-width, margin, box-shadow to `ion-app`
- `index.html` — optionally set body background via `<style>` or rely on CSS

❌ **Rejected: True responsive layout**
Reason: Would require restructuring every page (grid columns, tab bar
position, component sizing). Out of scope — this is a portfolio piece
demonstrating AI and engineering workflow, not responsive design.

❌ **Rejected: Breakpoint-triggered centering**
Reason: Unnecessary. `max-width: 430px` handles all cases — on mobile
the viewport is at or below 430px so it fills naturally; on desktop it
centers. A media query would add complexity with no benefit.

## Implementation Plan

**Phase 1 — Frame centering and background (CSS-only)**

1. Set `body { background-color: #111111 }` in global CSS
2. Apply `max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(0,0,0,0.6)` to `ion-app` in `src/App.css`
3. Verify on desktop (1280px+) and mobile (390px) that layout is correct
4. Remove the mobile viewport note from `README.md` (line 220)

## Trade-offs

**Easier:** Zero component changes. Minimal CSS. Ships in one phase.
Works immediately across all pages, modals, and routes.

**Harder:** Nothing — this approach has no meaningful downsides for the
stated goal.

**Ruled out of scope:** True responsive layout with adaptive grids and
navigation. Could be a future feature but is not needed to achieve the
portfolio goal.
