# Frontend structure

**Status:** as built, plus the naming rules for new files  
**App:** React 19, Vite, React Router 7, JavaScript (JSX)  
**Location:** `apps/web` (workspace `@imp/web`)

The shell is one single-page app. Module screens are not separate sites.

## Tree

```text
apps/web/
├── index.html
├── vite.config.js                # @webinar-live alias, /platform-api and /webinar-api proxies
├── scripts/smoke.mjs             # runs every src/**/*.smoke.mjs
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── core/api/platformClient.js    # fetch wrapper: cookies, error envelope, session-expired hook
    ├── auth/                         # AuthContext: login/logout, session from GET /api/auth/me
    ├── workspace/                    # customer and effective modules from the session user
    ├── routes/
    │   ├── AppRoutes.jsx
    │   ├── ProtectedRoute.jsx        # role gate, waits while the session loads
    │   └── ModuleAccessRoute.jsx     # entitlement gate
    ├── layouts/                      # launcher, admin, dialer, module workspace
    ├── pages/                        # login, dashboard, admin screens
    ├── components/                   # shared chrome and admin widgets
    ├── data/admin/                   # admin store over /api/admin (customers, users, grants, logs)
    ├── hooks/
    └── modules/
        ├── registry.js               # catalog: id, path, title, launcher copy
        ├── training-ai/
        ├── bdr/
        ├── prospecting/
        ├── radar/
        ├── vsl/
        └── webinar/                  # shell routes and handoff; live pages come from the Webinar frontend
```

Adding a module means a registry entry, a route group wrapped in `ProtectedRoute` and `ModuleAccessRoute`, a folder under `src/modules/<id>/`, and the id in `packages/shared` `MODULE_IDS`.

## Module folder

```text
src/modules/<id>/
├── index.js              # page exports used by AppRoutes.jsx
├── Layout.jsx            # module chrome, when the module has its own shell
├── pages/                # route screens, PascalCase
├── components/           # UI used only by this module
├── context/              # screen state; reads seeds or the API client
├── services/             # rules, state machines, providers, API client (services/api/)
├── data/                 # prototype seeds
├── styles/
└── utils/
```

| Module | Pages |
| --- | --- |
| `training-ai` | Catalog, scenarios, personas, templates, simulation, report, history |
| `bdr` | Painel, discagem automática, manual, histórico, agendamentos. Layout is `DialerLayout` in `src/layouts/` |
| `prospecting` | Search, qualify, send to BDR |
| `radar` | Dashboard, analysis, insight |
| `vsl` | Campaigns, configure, metrics |
| `webinar` | Dashboard, webinars, leads, studio, live, admin (from `@webinar-live`) |

Route paths match the module id: `/modules/<id>`. Admin is `/admin/*`.

## Auth and data

Login posts to `/platform-api/api/auth/login`; the API sets an httpOnly cookie, and the shell restores the session with `GET /api/auth/me`. The browser never stores a token. Any 401 from a non-auth route signs the user out of the shell.

`bdr` and `training-ai` always use the platform API. Their API clients sit in `src/modules/<id>/services/` and use `platformRequest`. Prototype modules import seeds from their context; pages do not import seeds and do not call HTTP.

## Webinar inside the shell

`vite.config.js` aliases `@webinar-live` to `services/webinar/frontend/src`; `src/modules/webinar/index.js` re-exports those pages into IMP routes. React, React Router, and Zustand resolve to the shell's copies so there is one React tree. Webinar dependencies such as `lucide-react` and `axios` come from `apps/web`.

Entering Webinar calls `POST /platform-api/api/modules/webinar/handoff`, then exchanges the returned code at `/webinar-api/auth/imp-handoff/exchange`. Do not copy Webinar pages into `src/modules/webinar/pages`; change the Webinar source or the thin IMP adapter.

## File names

| File | Name |
| --- | --- |
| Screen | `pages/ScenarioDetail.jsx` |
| Shared widget in a module | `components/AgentAvatar.jsx` |
| Context | `context/TrainingAiContext.jsx` |
| Seed data | `data/seeds.js` |
| Styles | `styles/training-ai.css` or a CSS file next to a layout |
| Barrel used by the router | `index.js` exporting pages only |
| Smoke test | `<name>.smoke.mjs` next to the code it checks |

Shell code stays JavaScript until a deliberate TypeScript conversion. Do not convert the whole shell as a side effect of one module.

## UI state

Server data for a production module lives in its context. Zustand is for client-only UI state. Do not put API lists in a global store.

## What not to add in the shell

- SQL, secrets, integration keys, or direct MySQL access
- A second copy of a module under another folder
- Client-side filtering of a full production list. Send `q`, `status`, `page`, and `pageSize` to the API
