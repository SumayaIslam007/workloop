# Architecture Decision Records

Short records of significant decisions: the context, what was chosen, and what it costs. They are never edited after being accepted; if a decision changes, a new ADR supersedes the old one.

| #                                               | Decision                                                       | Status   |
| ----------------------------------------------- | -------------------------------------------------------------- | -------- |
| [0001](0001-two-services.md)                    | Split into two services: work orders and invoicing             | Accepted |
| [0002](0002-rabbitmq-over-http.md)              | Communicate via RabbitMQ events, not direct HTTP               | Accepted |
| [0003](0003-database-per-service.md)            | One database per service                                       | Accepted |
| [0004](0004-prisma-over-typeorm.md)             | Prisma as the ORM for the NestJS API                           | Accepted |
| [0005](0005-state-machine-as-pure-function.md)  | Work-order state machine as a pure, shared function            | Accepted |
| [0006](0006-local-dev-with-managed-services.md) | Develop against managed cloud services instead of local Docker | Accepted |
