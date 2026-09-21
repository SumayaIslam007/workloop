# 0007. NestJS 11 rather than 12

**Status:** Accepted

## Context

NestJS 12 ships as ESM-only packages. Jest's ESM support is still experimental, and `ts-jest` plus `emitDecoratorMetadata` (which NestJS dependency injection relies on) works reliably only in CommonJS. The alternative test runners that handle ESM well need extra SWC tooling to emit decorator metadata.

## Decision

Build the API on NestJS 11 (CommonJS) with Jest, `ts-jest` and Supertest. Prisma Client is generated with `moduleFormat = "cjs"` and extensionless imports to match.

## Consequences

- Testing works with no experimental flags and no extra build tooling, which matters on a memory-constrained development machine.
- NestJS 11 is a supported release with a large amount of current documentation and community answers.
- **Cost:** one major version behind. Upgrading later means moving the service to ESM (`"type": "module"`, NodeNext imports with extensions), switching the test runner or adopting Jest's ESM mode, and regenerating Prisma Client as ESM. The choice is isolated to this service, so the web and mobile apps are unaffected.
