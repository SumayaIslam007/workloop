# 0006. Develop against managed cloud services instead of local Docker

**Status:** Accepted

## Context

The development laptop has 8 GB of RAM and limited space on the system drive. Running the full target stack locally (two MySQL instances, RabbitMQ, the API, the PHP service, Jaeger, Prometheus and Grafana under Docker Desktop/WSL2) needs more than 8 GB.

## Decision

- Run Node services and the web app directly on the host (`pnpm dev`), without containers.
- Use free managed services for infrastructure: MySQL (TiDB Cloud Serverless or Aiven), RabbitMQ (CloudAMQP), and Grafana Cloud for traces and metrics.
- Keep `docker-compose.yml` and Kubernetes manifests in the repo as the reference runnable stack, and validate them in GitHub Codespaces.
- Connection details come only from `.env` (git-ignored); `.env.example` documents the variables.
- Keep tooling memory-light: type checking happens once, in `tsc`. ESLint uses non-type-aware rules, and Jest transpiles only and runs in a single process.

## Consequences

- Low local memory and disk usage; development is possible on modest hardware.
- Configuration is 12-factor from day one, since every dependency is reached by URL.
- **Cost:** development needs an internet connection, free tiers may pause when idle (slow first request), and managed MySQL can differ slightly from the MySQL 8 image used in Compose. CI must run tests against a containerised MySQL to catch such differences.
