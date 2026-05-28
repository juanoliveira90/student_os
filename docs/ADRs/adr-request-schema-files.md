# Request schema files

Status: Accepted

Decision date: 2026-05-25

Related commits: `68e5149`, `b9637b9`

## Context

Fastify can validate request bodies before handlers run. Login, register, and schedule writes all need predictable request shapes.

Keeping schemas inside controllers made the controller files noisier and mixed route behavior with validation definitions.

## Decision

Request schemas are defined next to their modules in dedicated schema files:

- `auth.schemas.ts` defines the register and login request bodies.
- `schedule.schema.ts` defines the schedule add-event request body.

Controllers import these schemas and attach them to route options.

## Consequences

- Controllers are easier to read because route handlers focus on behavior.
- Validation can reject malformed requests before service or query code runs.
- Schemas are close to the module that owns them, so changes do not require a global schema registry.
- The schema files should stay in sync with TypeScript request types to avoid drift between runtime validation and compile-time assumptions.
