# Current project map

**Status:** as built, 2026-10-01  
**Standard:** [architecture overview](../architecture/overview.md)

## Runtime

```text
Browser
  └── Vite shell                      apps/web (:5173)
        ├── Session                   httpOnly cookie from the platform API
        ├── Module screens            src/modules/<id>
        └── Webinar live UI           alias @webinar-live → services/webinar/frontend/src

/platform-api  →  Platform API        apps/api (:4000)  →  MySQL imp
                                        └── FaleVono (telephony) for Discagem Automática
/webinar-api   →  Webinar API         services/webinar/backend (:3001)  →  MySQL imp_webinar

MySQL 8.4                              docker-compose.yml (imp, imp_webinar, imp_test)
```

## Repository

```text
imp-platform/
├── apps/web/                    IMP shell (@imp/web)
├── apps/api/                    Platform API (@imp/api): migrations 001–007, Vitest suites
├── packages/shared/             @imp/shared: module ids, roles, profiles, effectiveModuleIds()
├── services/webinar/            Separate product: frontend, backend, deployment. Own lockfile
├── infra/mysql/init/            Creates imp_webinar and imp_test on a fresh MySQL volume
├── .github/workflows/ci.yml     Lint, typecheck, tests (MySQL service), build; Webinar typecheck
├── docs/                        This documentation (text tracked; reference media ignored)
├── docker-compose.yml
└── package.json                 npm workspaces and root scripts
```

Markdown, the OpenAPI spec, and small JSON indexes under `docs/` are versioned. Reference media (`*.png`, `*.jpg`, `*.mp4`, `*.docx`, over 1 GB in total), scraped captures in `docs/screenshots/bdr/live-fetch/`, and `docs/video/` stay local and are ignored.

## Shell (`apps/web/src`)

| Path | Role now |
| --- | --- |
| `core/api/` | Platform API client (cookies, error envelope, session expiry) |
| `auth/` | Session from `/api/auth/me`; login and logout through the API |
| `workspace/` | Customer and effective modules from the session user |
| `data/admin/` | Admin store over `/api/admin` |
| `routes/` | `AppRoutes`, role gate, module gate |
| `layouts/` | Launcher, admin, dialer, module workspace |
| `pages/` | Login, dashboard, admin. `pages/modules/` is an older layer; see the removal register |
| `modules/training-ai/` | Production. API client, screens, browser voice (speech synthesis and dictation). No seeds |
| `modules/bdr/` | Production. API repository (dialer, queue, history, recordings). No seeds |
| `modules/prospecting/`, `radar/`, `vsl/` | Customer prototypes on seeds |
| `modules/webinar/` | IMP routes, handoff, session bridge. Live screens re-exported from the Webinar frontend |

## Platform API (`apps/api/src/modules`)

| Module | Routes |
| --- | --- |
| `auth` | `/api/auth/login`, `/logout`, `/me` |
| `customers`, `users`, `audit` | `/api/admin/customers`, `/users`, `/audit-logs` |
| `training-ai` | `/api/modules/training-ai/*` |
| `bdr` | `/api/modules/bdr/*` |
| `webinar-bridge` | `/api/modules/webinar/handoff` |

## Routes that define the product

| Area | Path |
| --- | --- |
| Login | `/login` |
| Launcher | `/dashboard` |
| Admin | `/admin`, `/admin/customers`, `/admin/users`, `/admin/modules`, `/admin/permissions`, `/admin/logs` |
| Treinamento IA | `/modules/training-ai` and nested scenario, persona, template, simulation, report, and history paths |
| Discagem Automática | `/modules/bdr`, `/discagem`, `/manual`, `/historico`, `/agendamentos` |
| Prospecção | `/modules/prospecting`, `/qualify/:companyId`, `/enviar-bdr` |
| Radar | `/modules/radar`, `/analise`, `/insight/:insightId` |
| VSL | `/modules/vsl`, `/:campaignId`, `/:campaignId/metricas` |
| Webinar | `/modules/webinar/**` using live Webinar pages, plus shell routes `overview`, `sidecar`, and `reuniao-1a1` |

Module ids in `packages/shared`, the registry, route guards, API `requireModule`, and folders are the same strings: `training-ai`, `bdr`, `prospecting`, `radar`, `vsl`, `webinar`.
