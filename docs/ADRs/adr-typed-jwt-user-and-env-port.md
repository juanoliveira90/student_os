# Typed JWT user and environment port

Status: Accepted

Decision date: 2026-05-25

Related commit: `b6ccfce`

## Context

Authenticated routes need access to the decoded JWT payload through `request.user`. TypeScript did not know the shape of that payload by default.

The API also needed a configurable port instead of a hardcoded listen value.

## Decision

The project augments `@fastify/jwt` types in `fastify.d.ts` so `request.user` is typed as an object with `sub` and `email`.

The server reads `PORT` from environment variables in `index.ts` and passes it to Fastify's `listen` call.

## Consequences

- Authenticated controllers can use `request.user.sub` and `request.user.email` with clearer TypeScript support.
- JWT payload shape is documented in one type declaration instead of being guessed in each route.
- The API can run on different ports across local development, deployment, or tests.
- Missing environment variables now fail at runtime, so `.env` setup remains required.
