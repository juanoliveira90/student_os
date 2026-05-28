# Frontend auth routing and visible server errors

Status: Accepted

Decision date: 2026-05-23

Related commits: `b276d8e`, `d567049`

## Context

The app has cookie-based authentication handled by the API, but the browser still needs to decide what to show when a user opens `/app`, `/login`, or `/signup`.

The login and signup screens also need to show useful API feedback instead of hiding server-side failures behind a generic frontend state.

## Decision

The React app checks `/auth/me` during startup and keeps the current user in app state. If an unauthenticated user tries to open `/app`, the frontend redirects them to `/login`.

The login page reads non-OK server responses and shows the server message to the user.

## Consequences

- Users get immediate browser-level routing feedback before they interact with protected app screens.
- The backend remains the source of truth for authentication, because `/auth/me` is still checked against the API session cookie.
- Frontend route protection is not a replacement for backend route protection; API routes still need the Fastify auth hook.
- Server errors become visible enough to debug login/signup issues during development.
