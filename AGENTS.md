# AGENTS.md

    Contributor guide for AI coding agents (and humans). Tool-agnostic.

## Project Overview

Studium is a study platform built with Node.js on Fastify and React + Vite. All the content (user & user data) are stored in a database, hosted by Neon.

See `./agents-skills` for more skills

## Commands
~~~
# Build server
npm run build

# Run locally
npm run dev

# Testing
cd apps/api
node --test dist/tests/{test-folder}/{test-file}.js

~~~


## Code Rules
### Don't:
- Don't use request.body as any
- Don't use hardcoded credentials
- Don't leave mocked data (aside from unit testing)
- Don't guess, always ask
- Don't skip test
- Don't add dependecies without asking and justificating
### Do:
- Use 4 spaces
- Add tests for new feature
- Run tests before proposing changes
- Do a regression test after every new iteration
- Follow existing patterns 

## Tests
~~~
test/
  controller/   # controller integration tests (hits real database)
  service/      # service unit tests (mocks, should test individual business logic)
~~~

## Architecture
### Back end (Node.js)
~~~
studium/
└── apps/
    ├── api/          (Fastify + TypeScript backend)
    │   └── src/
    │       ├── db/
    │       │   ├── client.ts         — Drizzle ORM + Neon DB connection
    │       │   ├── schema.ts         — all table definitions
    │       │   └── migrations/       — SQL migration files + snapshots
    │       ├── modules/
    │       │   ├── auth/             — register, login, logout, email verification, profile/password update
    │       │   ├── notes/            — CRUD for notes
    │       │   ├── schedule/         — weekly schedule blocks (create, update, delete)
    │       │   └── studyPlan/        — subjects and their subtasks
    │       ├── app.ts                — Fastify instance setup (CORS, JWT, cookies, rate limiting, hooks)
    │       ├── index.ts              — server entry point
    │       └── fastify.d.ts          — type augmentations for Fastify
~~~
**Key points:**
- modules has:
- `.controller` - Handles http requests; passes user data to service.
- `.service` - Calls .query, catch errors, business logic.
- `.queries` - Database queries only.

**Pattern:** never call queries from controller, use service as an intermediate.

### Front end (React + Vite)
~~~
studium/
└── apps/
    └── web/          (React + Vite frontend)
        └── src/
            ├── components/
            │   ├── landing/          — marketing/landing page
            │   └── student-os/       — the main app shell and all feature pages
            │       ├── MainAppPage   — root layout, sidebar, theme, query wiring
            │       ├── Dashboard     — overview: today's schedule, study progress, quick actions
            │       ├── Schedule      — weekly grid with event CRUD
            │       ├── StudyPlans    — subjects + subtasks with progress tracking
            │       ├── Documents     — markdown note editor
            │       ├── FocusTime     — Pomodoro timer with session logging
            │       ├── Habits        — habit tracker (coming soon)
            │       ├── Settings      — profile, password, appearance, language
            │       ├── Sidebar       — navigation + user profile menu
            │       ├── data.js       — theme tokens, nav items, day labels, constants
            │       ├── icons.jsx     — all SVG icons as components
            │       ├── ui.jsx        — shared UI primitives (Modal, Card, PageHdr, etc.)
            │       └── markdown.js   — minimal markdown-to-HTML renderer
            ├── fetchs/               — API client functions + React Query options
            │   ├── apiUrl.ts
            │   ├── authFetchs.ts
            │   ├── scheduleFetchs.ts
            │   ├── studyPlanFetchs.ts
            │   └── notesFetchs.ts
            ├── i18n/
            │   ├── index.js          — i18next setup, language detection/storage
            │   └── locales/
            │       ├── en/common.json
            │       └── pt-BR/common.json
            ├── lib/
            │   └── queryClient.ts    — TanStack Query client config
            ├── App.jsx               — router setup, auth state, route guards
            ├── main.jsx              — React root mount
            └── styles/global.css     — base styles, scrollbar, markdown styles
~~~