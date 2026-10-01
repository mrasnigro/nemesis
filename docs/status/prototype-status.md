# Module development status

**Status:** as built, 2026-10-01  
**Map:** [project map](project-map.md)

Two tracks run in parallel. Customer prototypes keep changing in the shell. Production modules have API persistence behind the same screens.

| Track | Modules | Data | Changes allowed |
| --- | --- | --- | --- |
| Production | `training-ai`, `bdr` | Platform API and MySQL only. No seeds, no mock mode | Contract-first: update `openapi.yaml`, migration, and tests with the change |
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
| Screens | Catalog, scenarios, personas, playbooks, simulation (text or voice), report, history |
| API | `/api/modules/training-ai`: catalog CRUD (scenarios, personas, playbooks), `status`, `metrics`, `starter-catalog`, and sessions: start, send a message, finish, read |
| Data | API and MySQL only. No seeds, no mock repository, no data-mode flag. A new customer starts empty; the customer administrator installs the starter catalog (3 agents, 3 playbooks, 3 scenarios) or builds their own |
| AI | Runs on the server (`src/modules/training-ai/ai/`). `TRAINING_AI_PROVIDER=openai` with `TRAINING_AI_API_KEY` uses an OpenAI-compatible chat API (`TRAINING_AI_BASE_URL`, `TRAINING_AI_MODEL`) for the persona's replies and for the judge. The built-in rule-based provider is for development and tests only: in production, starting or continuing a session returns 503 `AI_NOT_CONFIGURED` until a provider is set |
| Scoring | The playbook is the rubric: the score is the sum of the weights of the criteria that pass. With the provider ready, the judge decides each criterion; if it fails or answers partially, the playbook's keyword rules decide. Finishing never depends on the model being up. `report.judgeSource` records `openai`, `openai+rules` or `rules` |
| Access | Everyone with the module reads the catalog and practices. Only the customer administrator (`customer_admin`) edits the catalog and installs the starter catalog. A trainee reads and acts only on their own sessions; the customer administrator can read all of them |
| Voice | The browser speaks the persona's replies (speech synthesis) and dictates the trainee's answers (speech recognition, Chrome and Edge). No audio is stored. No video avatar yet: HeyGen or D-ID would be another provider behind `services/avatar/` |
| Metrics | Personal, computed on the server: completed, average score, pending scenarios, streak in `PABX_TIMEZONE` |
| Tests | 35 API integration tests (access, catalog rules, session lifecycle, privacy, concurrency, provider failure, rubric, OpenAI provider with an injected fetch) and web smoke checks for the form models, avatar providers and dictation |
| Not built | Live run against a real model key (the OpenAI path is tested with an injected `fetch`). Interruption and talk-time metrics (they need audio). Video avatar |

### Discagem Automática (`bdr`) — production

| | |
| --- | --- |
| Screens | Painel, discagem automática, manual, histórico, agendamentos |
| API | `/api/modules/bdr`: campaigns, lead queue (import or Prospecção handoff), dial attempts, calls, recordings, meetings, metrics, telephony settings |
| Telephony | FaleVono provider. Each attempt is classified; only a human answer connects the operator. Unanswered leads are retried per customer settings. The 5-second rule is kept |
| Recordings | Downloaded after the call and stored on the server; streamed from `/calls/{id}/recording`. A meeting plays the recording of its linked call |
| Data | API and MySQL only. No seeds, no mock repository, no data-mode flag. A new customer starts empty: create a campaign, import leads (CSV or Prospecção), set the extension |
| Calls | `bdr_calls` is the single record of an attendance: linked to its attempt and lead, `qualification_id` and `callback_at` are columns, the diagnosis form stays in `call_json`. Meetings link through `call_id` |
| Telephony setup | The customer administrator configures the provider, credentials (write-only, encrypted) and retry rules in the Painel. `npm run telephony` is the CLI equivalent |
| Tests | 24 API integration tests: campaigns and queue, telephony privacy, dialer, call save and attempt finalize, recordings, meetings, metrics, tenant isolation |
| Not built | Meeting invitation e-mail (needs a mail provider). Real-line validation against FaleVono. Per-customer goals on the metric cards |

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
