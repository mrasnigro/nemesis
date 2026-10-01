# Webinar IMP Launcher

**Date:** 2026-08-06  
**IMP module path:** `src/modules/webinar/`  
**Sidecar path:** `services/webinar/` (unchanged by this integration)

---

## Architecture rule

IMP **does not** import, copy, or bundle Webinar frontend/backend source from `services/webinar`.

```
IMP Platform (shell)
  └── /modules/webinar   ← launcher + entitlements only
          │
          │  window.open (noopener,noreferrer)
          ▼
services/webinar         ← independent React + Express + MySQL app
```

---

## IMP role

| Responsibility | How |
|----------------|-----|
| Module entry | Route `/modules/webinar` → `WebinarHome` |
| Auth | Existing IMP `ProtectedRoute` (`imp` role) |
| Module permission | Existing `ModuleAccessRoute` / `ModuleRoute` (`moduleId="webinar"`) |
| Launch | Button **Acessar Webinar** → `webinarLauncher.js` |
| Config | `VITE_WEBINAR_URL` via `webinarConfig.js` |
| Future SSO | Extension points on config + launcher (no tokens in Phase 1) |

IMP remains the **platform shell**: login, workspace, module catalog, and safe exit to the sidecar.

---

## Webinar service role

| Responsibility | Owner |
|----------------|--------|
| Webinar product UI (studio, live, leads, admin) | `services/webinar/frontend` |
| APIs, WebRTC, JWT, MySQL | `services/webinar/backend` + `database/` |
| Deploy / runtime | `services/webinar/deployment/` |

WebinarPro stays the **system of record** for webinar domain features. See `docs/WEBINAR_SIDECAR_INTEGRATION_PLAN.md` and `docs/WEBINAR_SERVICE_STRUCTURE.md`.

---

## Module files

```
src/modules/webinar/
├── Layout.jsx
├── index.js
├── config/webinarConfig.js
├── services/webinarLauncher.js
├── pages/WebinarHome.jsx
└── styles/webinar.css
```

Route wiring: `src/routes/AppRoutes.jsx`  
Still wrapped by:

```jsx
<ProtectedRoute allowedRoles={['imp']}>
  <ModuleRoute moduleId="webinar">
    <WebinarLayout />
  </ModuleRoute>
</ProtectedRoute>
```

---

## Environment

```bash
# IMP root (.env / .env.local) — never commit secrets
VITE_WEBINAR_URL=http://localhost:3001
```

- Absolute `http:` / `https:` URL required.
- Trailing slash is stripped.
- If unset, the button stays disabled and the UI explains the missing config.

Rebuild IMP after changing Vite env (`npm run build` / `npm run dev`).

---

## Launch behavior (Phase 1)

1. User authenticates in IMP and has webinar module access.  
2. Opens `/modules/webinar`.  
3. Clicks **Acessar Webinar**.  
4. IMP opens `VITE_WEBINAR_URL` in a **new tab** with `noopener,noreferrer`.  
5. User logs into Webinar independently (until SSO exists).

---

## Future SSO integration point

Without merging codebases:

1. IMP verifies session + `hasModuleAccess('webinar')`.  
2. IMP (or a thin bridge) issues a **short-lived one-time handoff code**.  
3. Call `launchWebinarWithHandoff(code)` / `buildWebinarLaunchUrl({ handoffCode })`.  
4. Webinar service exchanges the code server-side for its own JWT.

Seams already reserved:

- `buildWebinarLaunchUrl({ handoffCode, returnTo })` in `webinarConfig.js`
- `launchWebinarWithHandoff()` in `webinarLauncher.js`

Do **not** put long-lived JWTs in the query string.

---

## Explicit non-goals

- Importing `services/webinar` into the IMP Vite graph  
- Porting studio/live pages into `src/modules/webinar`  
- Changing Webinar business logic for the launcher  
- iframe embedding (deferred; WebRTC/CORS risk)

---

## Related docs

- `docs/WEBINAR_SIDECAR_INTEGRATION_PLAN.md`
- `docs/WEBINAR_SERVICE_STRUCTURE.md`
- `docs/WEBINAR_SERVICE_RUNTIME_VALIDATION.md`
- `docs/WEBINAR_ENVIRONMENT_SECURITY_CHECK.md`
