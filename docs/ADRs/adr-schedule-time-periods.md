# Schedule time periods

Status: Accepted

Decision date: 2026-05-25

Related commits: `bbb1da1`, `b5aeadb`

## Context

The schedule UI asks users to enter event start and end times. A plain time value can be unclear in a 12-hour UI because `09:00` may mean morning or evening depending on user intent.

## Decision

Schedule items store both the time and the period:

- `start_time`
- `start_period`
- `end_time`
- `end_period`

The frontend provides AM/PM controls and time suggestions in five-minute intervals. It normalizes user input into a `HH:MM` value plus an `AM` or `PM` period before sending the schedule request.

## Consequences

- The UI matches how users commonly enter schedule times in a 12-hour format.
- The database keeps the period explicit instead of deriving it later from ambiguous text.
- API validation can restrict period values to `AM` or `PM`.
- If the app later needs 24-hour time, time zones, or duration calculations, the current split fields may need conversion logic.
