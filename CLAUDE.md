# CLAUDE.md

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

# Linting 
cd apps/web
npm run lint

and/or

cd apps/api
npm run lint

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
- Don't skip tests
- Don't remove tests
- Don't add dependecies without asking and justificating
- Don't do steps beyond what you was told to do.
- Don't use enigmatic variable names (single letter, unnecessary abbreviation...)
- Don't skip linting

### Do:
- Use 4 spaces
- Add tests before adding a new feature/iteration
- Make sure that new feature/iteration passses the tests
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
    │       ├── db/          # database client, schema definitions, and migrations
    │       │   ├── client.ts
    │       │   ├── schema.ts
    │       │   └── migrations/  # SQL migration files and snapshots
    │       ├── modules/     # feature modules with auth, notes, schedule, and study plan business logic
    │       │   ├── auth/
    │       │   ├── notes/
    │       │   ├── schedule/
    │       │   └── studyPlan/
    │       ├── app.ts        # Fastify instance setup (CORS, JWT, cookies, rate limiting, hooks)
    │       ├── index.ts      # server entry point
    │       └── fastify.d.ts  # Fastify type augmentations
~~~
**Key points:**
- `db/` contains the Drizzle ORM client, database schema, and migration snapshots.
- `modules/` is the domain boundary for feature-specific controllers, services, schemas, and queries.
- `app.ts` boots the Fastify app and applies shared hooks, auth, and request handling.
- `index.ts` starts the server.

**Module pattern:**
- `.controller` handles HTTP requests and passes user data to service.
- `.service` contains business logic, service orchestration, and query error handling.
- `.queries` contains raw database query operations only.

**Pattern:** never call queries from controller, use service as an intermediate.

### Front end (React + Vite)
~~~
studium/
└── apps/
    └── web/          (React + Vite frontend)
        └── src/
            ├── components/      # main UI pages, shared components, and feature screens
            ├── fetchs/          # API client functions and React Query helpers
            ├── i18n/            # localization setup and locale resources
            ├── lib/             # shared utilities, query client config, and helpers
            ├── styles/          # global CSS and visual styling
            ├── App.tsx          # router setup, auth state, route guards
            ├── main.tsx         # React root bootstrap
            └── vite-env.d.ts    # Vite environment type definitions
~~~

**Key patterns:**

- `components/` holds pages and UI primitives in one folder rather than nested feature directories.
- `fetchs/` centralizes API request functions and query option helpers for auth, notes, schedule, and study plans.
- `i18n/` contains translation loader plus locale JSON files.
- `lib/` contains reusable non-UI utilities and the TanStack Query client.
- `styles/` is the single source of global styling for the front end.
- `App.tsx` is the main SPA layout and route guard entry point, while `main.tsx` mounts the React app.
