# Vite API proxy

Status: Accepted

Decision date: 2026-05-25

Related commit: `460c556`

## Context

The React app calls API routes with relative URLs such as `/auth/me` and `/schedule/add`. During development, Vite serves the frontend on its own port while Fastify serves the API on port `3001`.

Without a dev proxy, the browser would send those relative requests to Vite instead of the API.

## Decision

The Vite dev server proxies API route prefixes to Fastify. The existing auth proxy is kept, and the schedule prefix is added:

- `/auth` proxies to `http://localhost:3001`.
- `/schedule` proxies to `http://localhost:3001`.

Frontend code continues to call relative paths.

## Consequences

- Frontend requests look the same from React components regardless of local Vite port.
- Cookie-based auth is simpler because the browser interacts with same-origin relative paths in development.
- New API modules need to be added to the proxy if they use a new top-level route prefix.
- The proxy is a development concern; production routing still needs deployment-level configuration.
