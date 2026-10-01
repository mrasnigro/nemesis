# Architecture overview

**Status:** as built, and the standard for ongoing work  
**Date:** 2026-10-01

IMP is a **modular monolith in one repository**: one React shell, one platform API, and one MySQL database for platform modules. Webinar remains its own deployable with its own API and its own database, and IMP manages access to it centrally.

```text
Browser
  └── IMP shell (React + Vite)                        apps/web
        ├── Production modules     training-ai, bdr   → /platform-api (platform API)
        ├── Customer prototypes    prospecting, radar, vsl   seeds in the browser
        └── Webinar UI             aliased from services/webinar/frontend → /webinar-api

Platform API (Express + TypeScript + mysql2 + Zod)    apps/api
  └── MySQL database `imp`, customer_id on every business table
        └── Telephony provider (FaleVono) for Discagem Automática

Webinar service (Express + TypeScript + Drizzle)      services/webinar
  └── MySQL database `imp_webinar` on the same server, never joined to `imp`
```

In development, Vite proxies `/platform-api` to `127.0.0.1:4000` and `/webinar-api` to `127.0.0.1:3001/api`, so the browser talks to one origin and the session cookie stays first-party.

## Two tracks, one shell

Screens, routes, and the module registry live in the shell for every module. Each module is on one track:

| Module id | Product name | Track | Data source |
| --- | --- | --- | --- |
| `training-ai` | Treinamento IA | Production | `/api/modules/training-ai/…` when `VITE_TRAINING_AI_DATA=api`; seeds when `mock` |
| `bdr` | Discagem Automática | Production | `/api/modules/bdr/…`. API and MySQL only |
| `prospecting` | Prospecção | Customer prototype | Seeds and context |
| `radar` | Radar de Tendências | Customer prototype | Seeds and context |
| `vsl` | VSL | Customer prototype | Seeds and context |
| `webinar` | Webinar | Integrated product | Webinar API |

Prototypes keep iterating with the customer in the shell. A prototype is promoted only after its flow is accepted: freeze the fields, add the resources to `openapi.yaml`, add the `apps/api` module and migration, then switch the context to the API client behind `VITE_<MODULE>_DATA`. The screens stay. List filters for production modules are query parameters; the browser does not download a full table and filter it.

## Access

```text
Platform role
  admin  (IMP staff, no customer)          → /admin, every customer
  imp    (customer user, one customer)
    profile: customer_admin | sdr_bdr | closer

Effective modules = customer_modules (contract) ∩ user_modules (grant)
```

The API computes effective modules on every request (`requireAuth`), returns them from `GET /api/auth/me`, and enforces them with `requireModule(id)`. The shell mirrors the same set in `ModuleAccessRoute`, but hiding a link is not authorization.

Account management: a platform admin manages every customer, contract, and user. A `customer_admin` manages users and grants inside their own customer only and cannot change the contract. Removing a module from a contract removes the matching user grants in the same transaction.

Sessions are an httpOnly `imp_session` JWT cookie carrying the user id and a `session_version`. A password change or deactivation bumps the version, which revokes every existing session. Suspending a customer blocks sign-in for all of its users. Sign-ins and admin changes are written to `audit_logs`.

## Webinar integration

Webinar keeps its own users, roles (`admin`, `client`), and JWT. IMP is the front door:

1. The shell calls `POST /api/modules/webinar/handoff` (requires the `webinar` module).
2. The platform API registers a one-time code with Webinar, server to server, using `WEBINAR_HANDOFF_SHARED_KEY`. The browser never holds that key.
3. The shell exchanges the code at `POST /webinar-api/auth/imp-handoff/exchange` and receives a Webinar session. Codes are random, single-use, and expire within five minutes.

Handoff users are created in Webinar with an unusable password, so they can sign in only through IMP. The IMP customer id travels as `workspaceId`.

## Tenancy

Every platform business table includes `customer_id`. The session supplies it; a client-supplied customer id is ignored except on admin routes where a platform admin acts across customers. List indexes lead with `customer_id`.

## Repository

```text
imp-platform/
├── apps/
│   ├── web/                 # IMP shell
│   └── api/                 # platform API, migrations, tests
├── packages/
│   └── shared/              # module ids, roles, profiles, effectiveModuleIds()
├── services/
│   └── webinar/             # separate product, own lockfile, not a workspace
├── infra/mysql/init/        # creates imp_webinar and imp_test on a fresh volume
├── .github/workflows/ci.yml
├── docker-compose.yml
└── package.json             # npm workspaces: apps/*, packages/*
```

Internal source stays in `src/`. Module folders stay `modules/`, matching the registry and `ModuleAccessRoute`. Do not rename them to `features`.

## Naming

| Kind | Pattern | Example |
| --- | --- | --- |
| Folder, module id, URL segment | kebab-case | `training-ai`, `/modules/bdr` |
| Workspace package | `@imp/<name>` | `@imp/web`, `@imp/api`, `@imp/shared` |
| React component file | PascalCase | `Catalog.jsx`, `Painel.jsx` |
| React context, hook, layout | PascalCase or `use` prefix | `TrainingAiContext.jsx`, `useAuth.js` |
| Backend module file | `<module>.<role>.ts` | `training-ai.repository.ts` |
| SQL migration | `NNN_<module>_<topic>.sql` | `005_bdr_dialer.sql` |
| SQL table | snake_case, module prefix | `training_scenarios`, `bdr_dial_attempts` |
| JSON field | camelCase | `funnelStage`, `customerId` |
| Env var, web | `VITE_<NAME>` | `VITE_TRAINING_AI_DATA` |
| Env var, API | `SCREAMING_SNAKE` | `DB_HOST`, `JWT_SECRET` |

## Module rules

- A controller handles HTTP only. A repository runs SQL only. A service holds business rules.
- One module calls another through its service. It does not read the other module's tables.
- Slow work (call placement, recording download, scoring, imports) is a service function. A queue can wrap that function later; Redis is not required yet.
- Webinar UI may be composed into the shell through the `@webinar-live` alias. Webinar persistence stays in `services/webinar`.

## Next steps

1. Customer-admin view of `/admin` in the shell (the API already scopes those routes).
2. Switch the `VITE_TRAINING_AI_DATA` default to `api` once the demo no longer needs offline seeds, then remove the seeds per the removal register. BDR is already API-only.
3. Promote Prospecção, Radar, and VSL one at a time after the customer accepts each prototype.
4. Webinar: move its route files toward the same layering and add integration tests before larger feature work.

## Related documents

- [Frontend structure](../frontend/structure.md)
- [Backend structure](../backend/structure.md)
- [API documentation](../api/README.md)
