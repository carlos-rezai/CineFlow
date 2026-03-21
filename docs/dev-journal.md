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
