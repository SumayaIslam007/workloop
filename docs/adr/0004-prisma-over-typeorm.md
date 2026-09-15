# 0004. Prisma as the ORM for the NestJS API

**Status:** Accepted

## Context

The API needs type-safe database access, versioned migrations, and a seed script, with TypeScript strict mode on. TypeORM is NestJS's traditional pairing; Prisma is the main alternative.

## Decision

Use Prisma with MySQL 8, using `prisma migrate` (never `db push`) so every schema change is a committed migration file.

## Consequences

- Query results are fully typed from the schema, which works well with `strict: true` and no `any`.
- A single `schema.prisma` file is easy to review in PRs.
- Interactive transactions (`$transaction`) support the outbox pattern: status update and event insert commit together.
- **Cost:** less idiomatic in NestJS than TypeORM's decorators, so a small `PrismaService` wrapper is needed. Some complex queries need raw SQL. A code-generation step (`prisma generate`) must run before builds and in CI.
