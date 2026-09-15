# 0003. One database per service

**Status:** Accepted

## Context

If invoicing read the work-order tables directly, any schema change in the API could silently break invoicing, and the two services would be coupled at the data layer even though they are separate processes.

## Decision

`work-order-api` and `invoicing` each own a separate MySQL database. No service reads or writes another service's database. Invoicing receives everything it needs (work order id, amount inputs, company, technician) in the event payload.

## Consequences

- Each service can change its schema freely; the event payload is the only contract.
- **Cost:** no cross-database joins or foreign keys. Data the invoice needs is copied at event time, so it reflects the order as it was when completed (which is correct for an invoice). Event payloads must be versioned carefully.
