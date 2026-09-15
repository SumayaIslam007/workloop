# Architecture

## Services and ownership

| Service                   | Owns                                                | Talks to others via                        |
| ------------------------- | --------------------------------------------------- | ------------------------------------------ |
| `work-order-api` (NestJS) | Users, companies, work orders, applications, outbox | REST (inbound), RabbitMQ events (outbound) |
| `invoicing` (PHP/Slim)    | Invoices, processed-event log                       | RabbitMQ events (inbound), REST (inbound)  |

Each service has its **own database**. The invoicing service never reads work-order tables; it only knows what arrives in events.

## Domain model

```mermaid
erDiagram
  USER ||--o| COMPANY : "owns (buyer)"
  COMPANY ||--o{ WORK_ORDER : posts
  USER ||--o{ APPLICATION : "submits (technician)"
  WORK_ORDER ||--o{ APPLICATION : receives
  USER |o--o{ WORK_ORDER : "assigned to (technician)"
  WORK_ORDER ||--o{ OUTBOX_EVENT : emits

  USER {
    string id PK
    string email UK
    string password_hash
    enum role "buyer | technician | admin"
  }
  COMPANY {
    string id PK
    string name
    string owner_user_id FK
  }
  WORK_ORDER {
    string id PK
    string company_id FK
    string title
    text description
    string location
    decimal pay_rate
    enum status
    string technician_id FK "nullable"
    datetime scheduled_at
  }
  APPLICATION {
    string id PK
    string work_order_id FK
    string technician_id FK
    enum status "pending | accepted | rejected"
  }
  OUTBOX_EVENT {
    string id PK
    string aggregate_id
    string type
    json payload
    datetime published_at "null until published"
  }
```

`INVOICE` (id, work_order_id, amount, status, pdf_path) lives in the **invoicing database**. Its `work_order_id` is a plain value copied from the event, not a foreign key, because the two tables are in different databases.

## Work-order state machine

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> PUBLISHED: publish
  PUBLISHED --> ASSIGNED: assign
  ASSIGNED --> IN_PROGRESS: start
  IN_PROGRESS --> COMPLETED: complete
  COMPLETED --> APPROVED: approve
  PUBLISHED --> CANCELLED: cancel
  ASSIGNED --> CANCELLED: cancel
  IN_PROGRESS --> CANCELLED: cancel
  APPROVED --> [*]
  CANCELLED --> [*]
```

Rules:

- Implemented as a pure function in [`packages/shared-types/src/work-order/state-machine.ts`](../packages/shared-types/src/work-order/state-machine.ts). It has no framework or database code, and every status/action pair is unit tested.
- Any transition not in the table throws `InvalidTransitionError`, which the API maps to **409 Conflict**.
- Applying for a job creates an `Application`; it does **not** change the work order's status.
- `DRAFT` cannot be cancelled. A draft was never visible to anyone, so it is deleted instead.
- `COMPLETED` cannot be cancelled. Reversing finished work is a dispute process, not a status change.

## Open questions

- Who may `approve`: only the company owner, or any buyer in the company?
- Can a technician withdraw after being assigned? If so, does the order go back to `PUBLISHED` (a new `unassign` action)?
