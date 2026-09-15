# 0002. Communicate via RabbitMQ events, not direct HTTP

**Status:** Accepted

## Context

When a work order is completed, invoicing must eventually happen. If the API called the invoicing service over HTTP, an invoicing outage would either fail the user's "complete" request or lose the invoice.

## Decision

The API publishes a `work_order.completed` event to a RabbitMQ topic exchange. The invoicing service consumes it. Events are written to an outbox table in the same transaction as the status change, and a poller publishes them (transactional outbox).

## Consequences

- Completing a work order never depends on invoicing being up.
- No lost events: if the broker is down, events wait in the outbox.
- RabbitMQ delivers **at least once**, so the consumer must be idempotent (store processed event ids).
- **Cost:** a broker to run, a retry/dead-letter setup, and harder debugging across the async hop (addressed later with trace propagation through message headers).
