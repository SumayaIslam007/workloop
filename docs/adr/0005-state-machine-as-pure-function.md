# 0005. Work-order state machine as a pure, shared function

**Status:** Accepted

## Context

The work-order lifecycle is the core business rule. If transition checks are scattered across controllers, they drift, invalid transitions slip through, and the rules can only be tested through HTTP and a database.

## Decision

Define all legal transitions in one table inside `packages/shared-types`, exposed as pure functions (`transition`, `canTransition`, `availableActions`). Illegal transitions throw `InvalidTransitionError`, which the API maps to 409 Conflict. The API's domain service calls `transition()` before writing; the web and mobile apps call `availableActions()` to decide which buttons to show.

## Consequences

- Every status/action pair is covered by fast unit tests with no database.
- Client and server use the same rules, so the UI never offers an action the API will reject.
- **Cost:** clients depend on a shared package, so a rule change requires rebuilding them. The client check is only for UX; the server remains the authority, since clients can be outdated or bypassed.
