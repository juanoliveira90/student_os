# Schedule persistence model

Status: Accepted

Decision date: 2026-05-24

Related commits: `179babd`, `2adace0`, `7c7f9de`, `21b422d`

## Context

The schedule feature started as frontend state and mock data. To make schedule events survive reloads and belong to the logged-in user, the app needed a database model.

## Decision

Schedules are stored in Postgres with two tables:

- `schedule`, which belongs to one user.
- `schedule_items`, which stores the actual events for a schedule.

`schedule.user_id` has a unique constraint so each user has at most one schedule row. When adding an event, the API creates the user's schedule if needed and reuses the existing schedule on conflict.

The frontend schedule now starts empty instead of loading mock schedule events.

## Consequences

- Schedule data is ready to be persisted per user instead of living only in local UI state.
- The unique `user_id` constraint makes the "one schedule per user" rule enforceable by the database.
- `schedule_items` can grow independently and can later support editing, deleting, ordering, or querying events without changing the user table.
- Removing mock schedule data makes empty states real, but the UI needs future work to load saved schedule items from the API.
