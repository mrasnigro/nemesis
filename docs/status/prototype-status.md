# Module development status

**Status:** as built, 2026-10-01  
**Map:** [project map](project-map.md)

Two tracks run in parallel. Customer prototypes keep changing in the shell. Production modules have API persistence behind the same screens.

| Track | Modules | Data | Changes allowed |
| --- | --- | --- | --- |
| Production | `training-ai`, `bdr` | Platform API and MySQL (`VITE_<MODULE>_DATA=api`); seeds remain for offline demos | Contract-first: update `openapi.yaml`, migration, and tests with the change |
| Customer prototype | `prospecting`, `radar`, `vsl` | Seeds only. No platform routes | Flows, copy, and fields can still change |
| Integrated product | `webinar` | Webinar API and `imp_webinar` | Shell adapters and the Webinar service |

## Platform

| Area | Status | Notes |
| --- | --- | --- |
| Login and sessions | Production | httpOnly cookie, rate-limited login, session revocation on password change or deactivation |
| Customers, contracts, users, grants | Production | `/api/admin`. Platform admins manage all customers; the API also supports customer admins in their own customer |
| Audit log | Production | Sign-ins and admin changes in `audit_logs` |
| Admin screens | Production for IMP staff | Read and write the API. A customer-admin view of `/admin` is not built yet |
| Permissions catalog | UI only | Module access is enforced on the server. Fine-grained permission keys are not |
| Launcher and module gates | Production | Effective modules from `/api/auth/me` |
| CI | Running | `.github/workflows/ci.yml` |

## Modules

### Treinamento IA (`training-ai`) — production

| | |
| --- | --- |
| Screens | Catalog, scenarios, personas, templates, simulation, report, history |
| API | `/api/modules/training-ai`: scenarios, personas, templates (list, create, read, update), sessions |
| AI | `services/ai/` with `llm-mock` as the default provider. No external model yet |
| Avatar | `services/avatar/` timing mock. No video provider yet |
| Default data mode | `mock` until the demo no longer needs offline seeds |

### Discagem Automática (`bdr`) — production

| | |
| --- | --- |
| Screens | Painel, discagem automática, manual, histórico, agendamentos |
| API | `/api/modules/bdr`: campaigns, lead queue (import or Prospecção handoff), dial attempts, calls, recordings, meetings, metrics, telephony settings |
| Telephony | FaleVono provider. Each attempt is classified; only a human answer connects the operator. Unanswered leads are retried per customer settings. The 5-second rule is kept |
| Recordings | Downloaded after the call and stored on the server; streamed from `/calls/{id}/recording` |
| Default data mode | `mock` until the demo no longer needs offline seeds |

### Prospecção (`prospecting`) — customer prototype

| | |
| --- | --- |
| Screens | Search, qualify, send to BDR |
| Data | `data/seeds.js`. Filters run in `ProspectingContext` |
| Next | Iterate with the customer. When accepted, the handoff target already exists: `POST /api/modules/bdr/campaigns/{id}/leads` with `source: prospecting` |

### Radar de Tendências (`radar`) — customer prototype

| | |
| --- | --- |
| Screens | Dashboard, analysis, insight detail |
| Data | Seed cards, segments, and insights. `runAnalysis` builds a result in the browser |
| Next | No platform tables until the insight model is accepted |

### VSL — customer prototype

| | |
| --- | --- |
| Screens | Campaign list, landing configuration, conversion metrics |
| Data | Seed campaigns in `VslContext`. Saves do not leave the browser |
| Next | Same rule as Radar |

### Webinar — integrated product

| | |
| --- | --- |
| Product UI | `services/webinar/frontend`, mounted at `/modules/webinar` |
| API and database | `services/webinar/backend` on MySQL `imp_webinar`. See [webinar.md](../api/webinar.md) |
| IMP control | Module access is granted in IMP admin; entry is a server-to-server handoff |
| Known gaps | No automated tests; route files mix HTTP and SQL; legacy shell pages listed in the [removal register](removal-register.md) |

## Promotion checklist

Use this when a customer prototype is accepted.

1. Freeze the screens and the fields they show.
2. Add the resources to `docs/api/openapi.yaml`.
3. Add the `apps/api/src/modules/<id>` folder, a migration, and integration tests.
4. Add `src/modules/<id>/services/api` and switch the module context with `VITE_<MODULE>_DATA`.
5. Keep seeds for `mock` until the demo no longer needs them, then remove them as the register describes.
