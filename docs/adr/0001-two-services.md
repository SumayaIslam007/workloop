# 0001. Split into two services: work orders and invoicing

**Status:** Accepted

## Context

Work-order management is interactive and latency-sensitive. Invoicing is slow (PDF generation), can run after the fact, and changes for different reasons (tax rules, billing formats). Many real companies run legacy PHP billing next to newer Node services.

## Decision

Build two deployable services: `work-order-api` (NestJS) owns the work-order lifecycle; `invoicing` (PHP/Slim) owns invoices.

## Consequences

- Invoice generation can fail or be slow without affecting job posting or assignment.
- Each service can be deployed and scaled on its own.
- **Cost:** two codebases, two languages, two databases, and a broker to operate. Data is eventually consistent: an invoice appears seconds after completion, not instantly. For a system this size, a modular monolith would be simpler; the split is justified here by the different workload profile and by the goal of practising a service boundary.
