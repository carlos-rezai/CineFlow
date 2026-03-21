# CineFlow

> AI-Powered Movie Decision Engine — built with a structured Claude Code workflow

CineFlow is a personal 4K disc collection manager that uses AI to reason
about what to watch next. Instead of a simple recommender, it's a
**decision engine** — it analyses your watch history, taste profile, and
current mood to explain _why_ a specific film is the right choice right now.

---

## Why This Project Exists

This project has two purposes:

1. **A genuinely useful personal tool** — scan a barcode, get full movie
   metadata, track what you've watched, and let AI surface patterns in
   your collection you wouldn't notice yourself.

2. **A portfolio demonstrating AI-assisted engineering** — every feature
   was built using a structured Claude Code workflow: grill-me sessions,
   PRDs, TDD, and a living ubiquitous language document. The methodology
   is as much the point as the product.

---

## AI Features

### Decision Engine

Not "pick a movie" — "explain why this is the right choice right now."

The engine runs a multi-step pipeline:

1. Analyse watch history and taste profile
2. Generate candidate films from the collection
3. Rank against current constraints (mood, time, streaks)
4. Return a reasoned explanation, not just a title

### Mood → Movie Mapping

Type a mood in natural language:

> _"Something slow, dark, and atmospheric"_

The engine maps the input to film attributes, matches against your
collection, and returns ranked results with reasoning.

### Collection Intelligence

- "You own 12 unwatched films"
- "You're 2 films away from completing every Denis Villeneuve in your collection"
- "You tend to watch sci-fi on weekends"

### Taste Profiling

Passively builds a model of your preferences over time — genres,
directors, pacing, completion rate, rewatch frequency — without any
manual input.

---

## Development Methodology

This project was built using a structured **Claude Code skill workflow**.
Every feature follows the same sequence before a line of code is written:

```
grill-me → ubiquitous-language → write-a-prd → prd-to-plan
→ prd-to-issues → tdd → build → request-refactor-plan
```

**What this means in practice:**

- Every feature starts with a `grill-me` session — Claude interrogates
  the design until every assumption is resolved
- A PRD is written and filed as a GitHub issue before implementation
- Tests are written before code (TDD with tracer bullets)
- All domain terminology is locked in `docs/ubiquitous-language.md`
- Design decisions are recorded in `docs/design-logs/`

The `.claude/` folder contains all skill definitions. The `docs/` folder
contains the full paper trail — PRDs, design logs, and the ubiquitous
language dictionary — so the reasoning behind every decision is readable
alongside the code.

This approach is documented here because it's transferable. The workflow
is stack-agnostic and reusable across projects.

---

## Tech Stack

| Layer    | Choice                              | Why                                                |
| -------- | ----------------------------------- | -------------------------------------------------- |
| Frontend | React 19 + TypeScript + Vite 8      | Production-standard, full TypeScript coverage      |
| UI       | Ionic React v8                      | Mobile-first PWA, native feel without native build |
| Backend  | Node.js + Express                   | Lightweight, familiar in JS ecosystem              |
| Database | MongoDB Atlas                       | Document model fits movie metadata naturally       |
| AI       | Google Gemini 2.0 Flash (free tier) | Multi-step reasoning, streaming, no API cost       |
| External | TMDB API                            | Comprehensive movie metadata from barcode lookup   |
| Testing  | Vitest + Testing Library            | Fast, Vite-native, great DX                        |

---

## Project Structure

```
cineflow/
├── .claude/               # Claude Code skills and CLAUDE.md
├── ai/
│   ├── pipelines/         # Multi-step AI orchestration
│   ├── prompts/           # Typed prompt functions
│   └── types/             # AI-specific TypeScript types
├── server/                # Express backend
│   └── src/
│       ├── routes/
│       ├── services/      # MongoDB + TMDB logic
│       └── lib/
├── src/                   # React frontend
│   ├── features/          # Feature-scoped components + hooks
│   ├── lib/               # Pure logic (no AI, no DB)
│   ├── pages/
│   └── types/
└── docs/
    ├── design-logs/       # One file per feature, decision history
    ├── PRDs/              # Product requirements per feature
    └── ubiquitous-language.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas account — [free tier](https://www.mongodb.com/cloud/atlas)
- TMDB API key — [get one free](https://www.themoviedb.org/settings/api)
- Gemini API key — [aistudio.google.com](https://aistudio.google.com) (free, no billing required)

### Installation

```bash
git clone https://github.com/carlosrezai/cineflow.git
cd cineflow
npm install
```

### Environment Variables

Create a `.env` file in the root:

```
GEMINI_API_KEY=your_key_here
TMDB_API_KEY=your_key_here
MONGODB_URI=your_mongodb_atlas_uri
PORT=3001
VITE_API_BASE_URL=http://localhost:3001
```

### Run

```bash
# Frontend
npm run dev

# Backend (in a separate terminal)
cd server && npm run dev
```

---

## Build Status

| Feature                                               | Status         |
| ----------------------------------------------------- | -------------- |
| Collection core (barcode scan + TMDB + MongoDB)       | 🔲 In progress |
| Collection intelligence (stats + completion tracking) | 🔲 Planned     |
| Mood engine (natural language → collection match)     | 🔲 Planned     |
| Decision pipeline (multi-step AI reasoning)           | 🔲 Planned     |

---

## Docs

- [Ubiquitous Language](./docs/ubiquitous-language.md)
- [Design Logs](./docs/design-logs/)
- [PRDs](./docs/PRDs/)
- [Dev Journal](./docs/dev-journal.md)

---

## Author

**Carlos Rezai** — Senior Software Engineer, Berlin
Transitioning from frontend specialist to fullstack + AI integration.

[GitHub](https://github.com/carlos-rezai) · [LinkedIn](https://www.linkedin.com/in/aryan-carlos-r-0ba21017b/)

---

_Live demo coming once collection core is complete._
