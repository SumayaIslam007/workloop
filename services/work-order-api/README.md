# work-order-api

The core domain service: accounts, companies and work orders. NestJS 11, Prisma 7 and MySQL 8.

## Endpoints

| Method | Path                | Who                | Purpose                                               |
| ------ | ------------------- | ------------------ | ----------------------------------------------------- |
| POST   | `/auth/register`    | anyone             | Create a buyer (with a company) or technician account |
| POST   | `/auth/login`       | anyone             | Sign in                                               |
| POST   | `/auth/refresh`     | refresh cookie     | New access token; rotates the refresh token           |
| POST   | `/auth/logout`      | refresh cookie     | Revoke the session                                    |
| GET    | `/users/me`         | any signed-in user | The current user                                      |
| POST   | `/work-orders`      | buyers             | Create a work order as a `DRAFT`                      |
| GET    | `/work-orders`      | any signed-in user | Paginated list, filtered by what the caller may see   |
| GET    | `/work-orders/{id}` | any signed-in user | One work order                                        |
| GET    | `/health/live`      | anyone             | Liveness                                              |
| GET    | `/health/ready`     | anyone             | Readiness, including database connectivity            |

Interactive documentation runs at `http://localhost:3000/docs`.

## Setup

1. Create a MySQL 8 database (any provider) and copy `.env.example` to `.env`, filling in `DATABASE_URL` and `JWT_ACCESS_SECRET`.
2. Apply the schema and load demo data:

   ```bash
   pnpm db:deploy
   ```

   ```bash
   pnpm db:seed
   ```

3. Start the API:

   ```bash
   pnpm dev
   ```

### Demo accounts

Seeded users all share the password `Password123!`:

- Buyers: `buyer@acme.test`, `buyer@northwind.test`
- Technicians: `tech1@workloop.test` … `tech5@workloop.test`

## Scripts

| Command                     | What it does                               |
| --------------------------- | ------------------------------------------ |
| `pnpm dev`                  | Start with reload on change                |
| `pnpm build` / `pnpm start` | Compile to `dist/` and run it              |
| `pnpm test`                 | Unit and HTTP tests                        |
| `pnpm typecheck`            | Strict type check                          |
| `pnpm db:migrate`           | Create a new migration from schema changes |
| `pnpm db:deploy`            | Apply existing migrations                  |
| `pnpm db:seed`              | Reset demo data                            |
| `pnpm db:studio`            | Browse the database in a GUI               |

## Design notes

- **Authentication:** short-lived JWT access tokens plus opaque, rotating refresh tokens in an httpOnly cookie ([ADR 0008](../../docs/adr/0008-opaque-rotating-refresh-tokens.md)). Passwords are hashed with argon2.
- **Authorisation:** a global guard authenticates every route unless marked `@Public()`; `@Roles()` restricts by role. Work orders a user may not see return 404 rather than 403.
- **Lifecycle rules** come from `@workloop/shared-types`, so the API and the UI cannot disagree ([ADR 0005](../../docs/adr/0005-state-machine-as-pure-function.md)). `src/common/domain-sync.ts` fails the type check if the database enums drift from the shared types.
- **Errors** all share one JSON shape, and unexpected errors never leak internals.
- **Logging** is structured JSON (pino) with a request id on every line, echoed in the `x-request-id` response header.
