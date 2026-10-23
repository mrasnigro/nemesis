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

Requires Node 20.19+ and a local MariaDB service managed by FlyEnv, listening on `127.0.0.1:3306`. Docker is not required.

The platform API uses the existing `IMPDATABASE`; it does not need a new `imp` database. Before connecting the app, back up `IMPDATABASE` and confirm that its existing training tables/data are compatible with the platform migrations. Migrations can create or change tables in the selected database. Copy the API example environment file and set its database name and credentials to match your FlyEnv MariaDB account:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

In `apps/api/.env`, set `DB_NAME=IMPDATABASE`, and set `DB_USER` and `DB_PASSWORD` to the account configured in FlyEnv. Do not run `npm run db:migrate` against the existing database until you have a backup and have confirmed it is the intended target.

The API integration tests use a separate `imp_test` database. If you run the Webinar backend locally, it uses its own `imp_webinar` database. Create only the additional databases you need, using an administrator account:

```sql
CREATE DATABASE IF NOT EXISTS imp_webinar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS imp_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Ensure the account used by the API has the required privileges on `IMPDATABASE` and `imp_test`; grant `imp_webinar` access as well if using Webinar. Keep the MariaDB service bound to localhost. For Webinar, set `DB_USER` and `DB_PASSWORD` in `services/webinar/backend/.env` to the same local account.

`npm run db:up` is an optional Docker Compose helper and is not used with FlyEnv. The API integration tests refuse to run against a database whose name does not contain `test`.

After confirming the backup and target database, run:

```bash
npm ci
npm run db:migrate       # applies platform schema to IMPDATABASE
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
npm run test:asterisk    # isolated ARI provider tests; no MySQL service required
npm test                 # shared unit tests, web smoke suites, API integration tests (needs FlyEnv MariaDB imp_test)
npm run build
npm run webinar:typecheck
```

CI runs the same steps (`.github/workflows/ci.yml`) against a MySQL service container. Local testing uses the MariaDB service configured in FlyEnv.

## Documentation

| Topic | Document |
| --- | --- |
| How the system fits together | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Frontend structure and names | [docs/frontend/structure.md](docs/frontend/structure.md) |
| Backend structure and names | [docs/backend/structure.md](docs/backend/structure.md) |
| Platform API contract | [docs/api/README.md](docs/api/README.md), [docs/api/openapi.yaml](docs/api/openapi.yaml) |
| BDR Asterisk provider setup and remaining work | [docs/bdr-asterisk-provider.md](docs/bdr-asterisk-provider.md) |
| Webinar API | [docs/api/webinar.md](docs/api/webinar.md) |
| Current project map | [docs/status/project-map.md](docs/status/project-map.md) |
| Module status | [docs/status/prototype-status.md](docs/status/prototype-status.md) |
| Later removals | [docs/status/removal-register.md](docs/status/removal-register.md) |
