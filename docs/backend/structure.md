# Backend structure

**Platform API:** as built, `apps/api` (auth, admin, Treinamento IA, Discagem Automática, Webinar bridge).  
**Webinar API:** as built, `services/webinar/backend`.

Both are Node.js, Express, and TypeScript on MySQL. The platform API uses `mysql2` with checked-in SQL migrations. Webinar uses Drizzle ORM on its own database (`imp_webinar`). The two databases share a MySQL server and are never joined.

## Platform API

```text
apps/api/
├── migrations/                  # NNN_<topic>.sql, applied in order by npm run migrate
├── scripts/seed.ts              # dev seed; production mode creates only the platform admin
├── tests/                       # Vitest + Supertest against MySQL imp_test
├── vitest.config.ts
└── src/
    ├── server.ts                # listen, background jobs, graceful shutdown
    ├── app.ts                   # createApp(): middleware order and route mounts
    ├── core/
    │   ├── config.ts            # env parsed with Zod at startup; boot fails on bad config
    │   ├── db.ts                # mysql2 pool, withTransaction, isDuplicateKeyError
    │   ├── errors.ts            # AppError(status, code, message)
    │   ├── http.ts              # asyncHandler, 404 and error handlers
    │   ├── list.ts              # page/pageSize query schema and page meta
    │   ├── logger.ts            # JSON lines
    │   ├── requestContext.ts    # X-Request-Id and access log
    │   ├── rateLimit.ts         # fixed-window limiter (login)
    │   └── migrate.ts
    └── modules/
        ├── auth/                # login, logout, me, requireAuth, requireModule, account-manager guards
        ├── audit/               # recordAudit, GET /api/admin/audit-logs
        ├── customers/           # customers and module contracts
        ├── users/               # users and module grants
        ├── training-ai/
        ├── bdr/                 # campaigns, leads queue, dialer, calls, recordings, meetings
        │   └── telephony/       # provider interface, FaleVono, simulated, encrypted settings
        └── webinar-bridge/      # server-to-server Webinar handoff
```

A module folder holds `<module>.routes.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, and `.schemas.ts`. Larger modules split the service by topic (`bdr/dialer.service.ts`, `bdr/leads.repository.ts`). Prospecção, Radar, and VSL get a folder only when promoted.

### Layer rules

| File | May do | Must not do |
| --- | --- | --- |
| `*.routes.ts` | Map the URL, attach middleware | Query MySQL, encode business rules |
| `*.controller.ts` | Parse input with the schema, call the service, send the response | Import `mysql2` |
| `*.service.ts` | Rules, entitlements, orchestration, audit | Read `req` / `res` |
| `*.repository.ts` | Parameterized SQL, map rows | Know HTTP status codes |
| `*.schemas.ts` | Zod input shapes | Reach the database |

Modules talk through services. `bdr` does not import `training-ai.repository.ts` or query `training_*` tables.

### Request path

```text
requestContext → helmet → cors → json → cookies → route
  → requireAuth → requireModule(id) | requireAccountManager → controller → service → repository
```

`requireAuth` loads the user, customer, and effective modules (customer contract ∩ user grant) from MySQL on each request and rejects sessions whose `session_version` is stale. `customer_id` on writes comes from the session. List queries always include `customer_id` in the `WHERE` clause.

### List queries

Repositories apply filters in SQL. Shared parameters (`q`, `status`, `page`, `pageSize`, plus module-specific filters) are defined in [the API contract](../api/openapi.yaml). Default `pageSize` is 20, maximum 100. Offset paging is the v1 contract.

### Errors, logs, and health

Errors use the envelope in the OpenAPI spec. The logger writes one JSON line per request with the request id; server errors are logged with the same id. Responses never include a stack trace.

`GET /health` returns status, version, and a database check. It does not return host names, database names, or credentials.

### Configuration

Values live in `apps/api/.env` (never in git); names are documented in `apps/api/.env.example`.

Required: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `CORS_ORIGINS`.  
Optional: `PORT`, `NODE_ENV`, `TRUST_PROXY`, `LOGIN_RATE_LIMIT_MAX`, `WEBINAR_API_URL`, `WEBINAR_HANDOFF_SHARED_KEY`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, telephony and recording settings.  
`ALLOW_DEV_AUTH=true` enables the `X-Dev-User` header for local scripts only; it is ignored in production.

### Tests

`npm test -w @imp/api` runs integration tests against `imp_test`. The global setup applies migrations and refuses any database whose name does not contain `test`. The Vitest config pins every non-database env value so a developer shell cannot change what the tests exercise.

## Webinar service

```text
services/webinar/
├── frontend/                 # React + TypeScript + Vite; mounted into IMP via @webinar-live
├── backend/
│   ├── drizzle/              # generated MySQL migrations
│   ├── drizzle.config.ts
│   └── src/
│       ├── index.ts          # mounts routes, health, serves frontend/dist
│       ├── db/               # index.ts (mysql2 pool + Drizzle), schema.ts, seed.ts
│       ├── controllers/
│       ├── routes/
│       ├── services/         # impHandoffStore, leadService, …
│       ├── middleware/
│       └── utils/            # jwt, password (bcrypt)
├── database/webinar.sql      # legacy dump, reference only
└── deployment/
```

Webinar groups files by type. Leave that layout until it gets tests; new platform modules use the feature layout above. Do not merge Webinar routes into `apps/api`.

Commands (from the repository root): `npm run webinar:migrate`, `npm run webinar:seed`, `npm run webinar:typecheck`, `npm run dev:webinar`. Schema changes: edit `src/db/schema.ts`, then `npm --prefix services/webinar/backend run generate`.

Mounted prefixes are listed in [Webinar API](../api/webinar.md).

## Database

| Database | Engine | Owner |
| --- | --- | --- |
| `imp` | MySQL 8.4, InnoDB, `utf8mb4` | `apps/api` |
| `imp_webinar` | Same server | `services/webinar` |
| `imp_test` | Same server | API integration tests |

Platform primary keys are ULID strings (`CHAR(26)`). Business tables have `customer_id`, `created_at`, and `updated_at`. User-facing deletes set `deleted_at` where the table has it.

Table prefixes: `training_` and `bdr_`. Identity and access tables (`customers`, `users`, `customer_modules`, `user_modules`, `audit_logs`) have no module prefix.
