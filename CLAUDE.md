# CineFlow — AI-Powered Movie Decision Engine

## Project Overview

CineFlow is a personal 4K movie disc collection manager and AI-powered
decision engine. Core loop: scan barcode → fetch TMDB metadata → save
to MongoDB → AI reasons about what to watch next.

Portfolio project by Carlos Rezai demonstrating fullstack engineering,
AI integration, and Claude Code workflow.

## Tech Stack

- **Frontend:** React 19 + TypeScript, Vite 8
- **UI:** Ionic React v8 (mobile-first PWA) + React Router v5
- **Routing:** @ionic/react-router + react-router-dom v5
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **AI:** Google Gemini API — model always `gemini-2.5-flash`
- **External API:** TMDB for movie metadata
- **Testing:** Vitest + @testing-library/react
- **Linting:** ESLint + Prettier + Husky

## Dependency Notes

- React Router is v5 — NOT v6. Required by @ionic/react-router.
- No React Compiler — removed, incompatible. Using @vitejs/plugin-react.
- `src/types/ionic.d.ts` patches React 19 + Ionic v8 children prop
  conflict. Do not remove it.
- AI SDK: @google/generative-ai — install with `npm install @google/generative-ai`

## Folder Structurecineflow/

├── .claude/
├── ai/
│ ├── pipelines/
│ ├── prompts/
│ └── types/
├── server/src/
│ ├── routes/
│ ├── services/
│ └── lib/
├── src/
│ ├── assets/styles/
│ ├── components/
│ ├── features/
│ ├── hooks/
│ ├── lib/
│ ├── pages/
│ └── types/
└── docs/
├── design-logs/  
 ├── PRDs/  
 ├── refactor-plans/  
 ├── ubiquitous-language.md
└── dev-journal.md

## Architectural Boundaries

- `ai/` — everything with a prompt or Gemini API call
- `src/lib/` — pure logic and non-AI external API calls
- `server/src/` — MongoDB, TMDB proxy, AI pipeline execution
- `src/` never talks to MongoDB or TMDB directly

## Skills Location

All skills are in `.claude/skills/`. Claude Code should read the
relevant SKILL.md before starting any task that matches its description.

- `src/lib/storage.ts` is the only file that calls localStorage
- All MongoDB access goes through `server/src/services/`
- Never call the Gemini API from a component or page

## AI Build Order

1. Collection core — barcode scan, TMDB fetch, MongoDB save, mark watched
2. Collection intelligence — stats, unwatched count, director completion
3. Mood engine — mood text → attributes → collection matching
4. Decision pipeline — history → candidates → rank → explain

## Code Rules

- No `any` types — ever
- No business logic in components or pages — extract to hooks or lib
- All page components use default exports
- All prompts are typed functions in `ai/prompts/` — never inline strings
- Always stream user-facing AI responses
- Every function in `src/lib/` and `ai/pipelines/` must have a test
- No `console.log` in committed code
- All dates are ISO strings

## Ubiquitous Language

Single source of truth: `/docs/ubiquitous-language.md`
Read it before naming anything. Update it after every grill-me session.

## Data Model

Defined per feature through grill-me + write-a-prd.
Lives in `/docs/data-model.md` once established.

## Development Workflow

1. `grill-me` → shared understanding + design-log entry + ubiquitous-language update
2. `write-a-prd` → reads design-log → GitHub issue + docs/PRDs/
3. `prd-to-plan` → phased plan on issue
4. `prd-to-issues` → individual issues
5. `tdd` → failing tests
6. `build` → implement
7. `request-refactor-plan` → create issue
8. `refactor` → clean up
9. `ui-aperture-noir` → implement design theme

## Environment Variables

GEMINI_API_KEY=
TMDB_API_KEY=
MONGODB_URI=
PORT=3001
VITE_API_BASE_URL=http://localhost:3001

## Build Status

- [x] Collection core
- [x] Collection intelligence
- [x] Mood engine
- [x] Decision pipeline
- [x] Aperture Noir design system
- [x] Barcode scanning
- [x] Deployed — Vercel + Render + MongoDB Atlas
