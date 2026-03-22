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
