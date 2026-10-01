# Webinar API

**Status:** as built  
**Process:** `services/webinar/backend`, port 3001  
**Entry:** `services/webinar/backend/src/index.ts`  
**Database:** MySQL `imp_webinar` (Drizzle schema in `src/db/schema.ts`)

The IMP shell reaches this API in development through the Vite proxy: `/webinar-api/...` is rewritten to `/api/...` on the Webinar process.

Webinar auth is its own JWT (`admin` or `client` in the Webinar database). An IMP session does not authorize these routes. IMP users enter through the handoff below.

## IMP handoff

| Method | Path | Caller |
| --- | --- | --- |
| POST | `/api/auth/imp-handoff/register` | Platform API only, with header `x-imp-handoff-key` |
| POST | `/api/auth/imp-handoff/exchange` | Browser, with the one-time code |

- The platform API calls `register` from `POST /api/modules/webinar/handoff`. The key is `IMP_HANDOFF_SHARED_KEY` here and `WEBINAR_HANDOFF_SHARED_KEY` in `apps/api`; it never reaches the browser. In production the service refuses handoffs when the key is unset.
- Codes are random, single-use, compared in constant time, and expire within five minutes.
- `register` always creates a customer-level (`client`) Webinar user. Webinar admins sign in directly.
- Handoff users get an unusable password marker, so they cannot sign in with `/api/auth/login`.

## Health

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Pings MySQL. Returns `status`, `version`, `timestamp`, `database`. No host, database, or user names |

## Auth

| Method | Path |
| --- | --- |
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |
| POST | `/api/auth/logout` |
| POST | `/api/auth/forgot-password` |
| POST | `/api/auth/reset-password` |

Passwords are stored as bcrypt hashes (12 rounds). Login accepts only bcrypt hashes; there is no plaintext fallback. User payloads returned by admin routes omit `passwordHash`.

## Mounted routers

| Prefix | Route module |
| --- | --- |
| `/api/leads` | `src/routes/leadRoutes.ts` |
| `/api/public/leads` | `src/routes/publicLeadRoutes.ts` |
| `/api/client/leads` | `src/routes/clientLeadsRoutes.ts` |
| `/api/client/webinars` | `src/routes/clientWebinarRoutes.ts` |
| `/api/client` | `src/routes/clientRoutes.ts` |
| `/api/admin/clients` | `src/routes/adminClientsRoutes.ts` |
| `/api/admin/payments` | `src/routes/adminPaymentsRoutes.ts` |
| `/api/admin` | `src/routes/adminRoutes.ts` |
| `/api/webinar-leads` | `src/routes/webinarLeadsRoutes.ts` |
| `/api/webrtc` | `src/routes/webrtcRoutes.ts` |

Static files and the SPA fallback are served from `frontend/dist` for any path that does not start with `/api`.

## Data

`npm run webinar:migrate` applies `backend/drizzle/*.sql`. `npm run webinar:seed` ensures the plan catalog (Trial, Básico, Profissional, Enterprise) and, if `WEBINAR_SEED_ADMIN_EMAIL` and `WEBINAR_SEED_ADMIN_PASSWORD` are set, a direct-login Webinar admin.

## Boundary

Platform modules do not add routes here. Their contract is [openapi.yaml](openapi.yaml). Webinar does not read the `imp` database; the IMP customer id arrives only as the handoff `workspaceId`.
