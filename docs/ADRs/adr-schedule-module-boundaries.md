# Schedule module boundaries

Status: Accepted

Decision date: 2026-05-24

Related commits: `5b72bd8`, `476256d`, `7c7f9de`, `b6ccfce`

## Context

Adding schedule persistence introduced controller logic, database inserts, request types, and route registration. Keeping all of that in one file would make the feature harder to grow.

## Decision

The schedule feature is organized as its own API module:

- `schedule.controller.ts` owns Fastify route registration.
- `schedule.service.ts` owns application behavior.
- `schedule.queries.ts` owns Drizzle database access.
- `schedule.types.ts` owns the request data shape.
- `schedule.schema.ts` owns Fastify request validation.

The API registers this module in `app.ts` under the `/schedule` prefix.

The request body sent by the frontend uses an `events` array, even though the current API insert path only saves the first event.

## Consequences

- Schedule code follows the same controller/service/query direction as the auth feature.
- Database logic stays out of route handlers, making future schedule changes easier to localize.
- The `events` array gives the client and server a path toward batch saves, but the current backend behavior should be expanded before relying on full schedule sync.
- Registering `/schedule` in `app.ts` makes the feature protected by the existing auth hook unless a route is explicitly marked public.
