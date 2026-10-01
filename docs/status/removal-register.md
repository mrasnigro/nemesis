# Removal register

**Status:** planned deletions, updated 2026-10-01  
**Rule:** delete a row only when its "Remove when" condition is true. Prototype data stays while that module is still on the customer track.

The shell keeps one screen tree. Removals take away a second copy, an in-memory store, or a dead route. They do not take away module folders, `ModuleAccessRoute`, or the Webinar service.

## Done

| Item | Removed in |
| --- | --- |
| Hardcoded accounts and `sessionStorage` session (`src/auth`) | Platform foundation: login and `/me` go through the API |
| In-memory admin store and mock admin data (`src/data/admin/*.js` seeds) | Same change: the store reads and writes `/api/admin` |
| Mock login map (`src/data/access/`) | Same change |
| `X-Dev-User` header from the browser | Same change. The API accepts it only with `ALLOW_DEV_AUTH=true` outside production |
| Handoff shared key in the browser (`VITE_IMP_HANDOFF_SHARED_KEY`) | Same change. The key lives only in server env |
| Webinar SQLite database and `@libsql/client` | Webinar runs on MySQL `imp_webinar` |
| Database host, name, and user in Webinar `GET /health` | Health now pings MySQL and returns status only |
| Webinar request bodies in logs | Sensitive keys are redacted, and bodies are not logged in production |
| Plaintext Webinar passwords | bcrypt on every write; login rejects non-bcrypt hashes |
| Hardcoded Webinar JWT secret fallbacks | `utils/jwt.ts` refuses to start in production without 32+ character secrets |
| Hardcoded legacy Hostinger DB credentials | `src/diagnostic.ts` now uses the env-only pool. The old values remain in git history and must be rotated |
| BDR browser data mode (`VITE_BDR_DATA`, `bdrDataMode`) | BDR completion: the module always uses the platform API |
| BDR seeds and `mockBdrRepository` | BDR completion: `data/seeds.js`, `data/index.js` and `services/mockBdrRepository.js` deleted. Blank attendance forms moved to `data/emptyAttendance.js` |
| BDR demo rows in the dev database (`seedBdr`, `seedDialQueue`) | BDR completion: removed from `scripts/seed.ts`. Campaigns, leads, calls and meetings are created in the app |
| BDR re-export shims and old dialer CSS | BDR completion: `src/pages/modules/Bdr.jsx`, `src/pages/modules/bdr/*.jsx` deleted; `Bdr.css` moved to `src/modules/bdr/styles/bdr-pages.css` |
| Simulated "Reenviar Email" on meetings | BDR completion: the button only wrote a timestamp and showed a fake confirmation. Re-add it with a real mail provider |
| Simulated recording playback on meetings | BDR completion: a meeting plays the recording of its linked call |
| Client-side history ids and timestamps | BDR completion: the API owns ids and `startedAt`; meetings are linked through `bdr_meetings.call_id` |
| `bdr_campaigns.campaign_json` and JSON counters | Migration `006_bdr_calls_link.sql`: counters come only from `bdr_leads` |

## Keep on purpose

| Piece | Why it stays |
| --- | --- |
| `src/modules/<id>/` screens and routes | The prototype UI is the production UI |
| `training-ai` provider interfaces in `services/ai/` and `services/avatar/` | A real model or avatar plugs in behind the same interface |
| Simulated telephony provider | Local development and tests. Rejected in production |
| `services/webinar/` | Separate product and database |
| `ModuleAccessRoute` and `src/modules/registry.js` | Entitlements stay visible in the shell |

## Remove when a module runs on the API by default

| Item | Where | Remove when |
| --- | --- | --- |
| Training seeds | `src/modules/training-ai/data/` | `VITE_TRAINING_AI_DATA=api` is the default and the demo no longer needs the offline catalog |
| Training context writes that only update React state | `TrainingAiContext.jsx` | The context loads and saves only through `services/api` |
| In-browser prospect, radar, and VSL directories | each module's `data/seeds.js` and context filters | That module has been promoted and list filters run in SQL |

Keep a small fixture for tests if a test needs sample rows. That fixture is not imported by the app.

## Dead shell files (safe once nothing imports them)

| Item | Where | Remove when |
| --- | --- | --- |
| Coming-soon stubs | `src/pages/modules/TrainingAi.jsx`, `Prospecting.jsx`, `Radar.jsx`, `Vsl.jsx` | A search shows no imports |
| Unused barrel | `src/pages/modules/index.js` | Same search. It imports `modules/webinar/pages/Events.jsx`, which does not exist |
| Coming-soon component | `src/components/ModulePage.jsx`, `ModulePage.css` | After the stubs are gone |
| Old Webinar shell screens | `src/modules/webinar/pages/WebinarList.jsx`, `WebinarNew.jsx`, `WebinarDetail.jsx`, `WebinarAppDashboard.jsx` | Confirmed unused |
| Shim re-exporting the old dashboard | `src/pages/modules/Webinar.jsx` | Same time as those screens |
| Legacy Webinar redirects | `AppRoutes` paths `/modules/webinar/app`, `/webinars`, `/webinars/novo`, `/webinars/:webinarId` | No bookmarks or docs send people there |
| Emergency sidecar launcher | `WebinarSidecar.jsx` and `/modules/webinar/sidecar` | In-app Webinar no longer needs a second-tab escape hatch |
| Unwired header search | Search input in `src/components/Header.jsx` | Remove it or connect it to a real search |

All paths above are under `apps/web/`.

## Remaining in the Webinar service

| Item | Where | Remove when |
| --- | --- | --- |
| Hardcoded production API host fallback | `apps/web/vite.config.js` (`https://s1m0ne.tec.br/api` when `VITE_WEBINAR_API_URL` is unset in a production build) | Deployed shells set `VITE_WEBINAR_API_URL` explicitly |
| Legacy SQL dump | `services/webinar/database/webinar.sql` | Nobody needs it as a reference for the old schema |
| Local `sqlite.db` file | `services/webinar/database/` (untracked, ignored) | Any time |

## Local artifacts (not application source)

| Item | Remove when |
| --- | --- |
| `apps/web/dist/`, `.builds/`, `.cursor-cmp/` | Any time. Gitignored |

## Documents that are no longer the standard

Move them to `docs/archive/` when convenient.

| Document | Why it is stale |
| --- | --- |
| `docs/IMP_PLATFORM_TECHNICAL_HANDOVER.md` | Describes modules as placeholders and says the backend was not started |
| `docs/IMP_CLIENT_DEMO_VALIDATION.md` | Mock logins and an in-shell Webinar event prototype, neither of which exists now |
| `docs/IMP_PLATFORM_ARCHITECTURE_V1.md` | Says `src/` must never import the Webinar frontend; the shell now mounts it through `@webinar-live` |
| `docs/WEBINAR_*.md` | Written for SQLite and a browser-held handoff key |

The current standard is the set linked from [docs/README.md](../README.md).
