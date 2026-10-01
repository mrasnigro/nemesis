# IMP Platform

IMP is the commercial workspace shell for AI-assisted sales operations. One login opens the modules a customer is entitled to: Treinamento IA, Discagem Automática, Prospecção, Radar de Tendências, VSL, and Webinar.

| Part | Path | Stack |
| --- | --- | --- |
| Web shell | `apps/web` | React 19, Vite, React Router 7 |
| Platform API | `apps/api` | Node, Express, TypeScript, mysql2, Zod |
| Shared constants | `packages/shared` | Module ids, roles, profiles, entitlement rule |
| Webinar | `services/webinar` | Separate product: React frontend, Express + Drizzle backend, own MySQL database |

`apps/*` and `packages/*` are npm workspaces with one root lockfile. `services/webinar` keeps its own `package.json` and lockfile so it can still deploy on its own.

## Run locally

Requires Node 20.19+ and Docker.

```bash
npm install
npm run db:up            # MySQL 8.4 on :3306 (creates imp, imp_webinar, imp_test on a fresh volume)
npm run db:migrate       # platform schema
npm run db:seed          # dev customers and accounts (below)
npm run dev              # API on :4000 + web on :5173
```

Webinar inside IMP also needs its backend:

```bash
npm run webinar:install  # once
npm run webinar:migrate
npm run webinar:seed     # plans catalog
npm run dev:all          # API + web + Webinar backend on :3001
```

Copy `apps/api/.env.example` to `apps/api/.env` and `services/webinar/backend/.env.example` to `services/webinar/backend/.env`. `WEBINAR_HANDOFF_SHARED_KEY` (API) and `IMP_HANDOFF_SHARED_KEY` (Webinar) must be equal; the browser never sees that key.

Dev seed accounts (password = username): `admin` (IMP staff), `gestor` (customer admin, Acelere), `imp` and `bdr` (Acelere, all modules), `sdr` (NovaRota, Treinamento IA and Prospecção).

## Checks

```bash
npm run lint
npm run typecheck
npm test                 # shared unit tests, web smoke suites, API integration tests (needs MySQL imp_test)
npm run build
npm run webinar:typecheck
```

CI runs the same steps (`.github/workflows/ci.yml`) against a MySQL service container.

## Documentation

| Topic | Document |
| --- | --- |
| How the system fits together | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Frontend structure and names | [docs/frontend/structure.md](docs/frontend/structure.md) |
| Backend structure and names | [docs/backend/structure.md](docs/backend/structure.md) |
| Platform API contract | [docs/api/README.md](docs/api/README.md), [docs/api/openapi.yaml](docs/api/openapi.yaml) |
| Webinar API | [docs/api/webinar.md](docs/api/webinar.md) |
| Current project map | [docs/status/project-map.md](docs/status/project-map.md) |
| Module status | [docs/status/prototype-status.md](docs/status/prototype-status.md) |
| Later removals | [docs/status/removal-register.md](docs/status/removal-register.md) |
