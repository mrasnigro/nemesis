# API documentation

IMP has two HTTP APIs. They do not share a database or a token.

| API | Process | Base | Contract |
| --- | --- | --- | --- |
| Platform | `apps/api`, port 4000 | `/api`. The web app calls it as `/platform-api` | [openapi.yaml](openapi.yaml) |
| Webinar | `services/webinar/backend`, port 3001 | `/api`. The web app calls it as `/webinar-api` | [webinar.md](webinar.md) |

Every path in `openapi.yaml` is implemented. When a route ships or changes, update the spec in the same change and run `npx @redocly/cli lint docs/api/openapi.yaml`.

## Platform conventions

- JSON only. Field names are camelCase.
- Authenticated routes use the httpOnly `imp_session` cookie (`Secure` in production, `SameSite=Lax`). No token is stored in `localStorage`.
- The session carries the user id. Role, customer, and effective modules are reloaded from MySQL on every request, so revocations apply immediately.
- Handlers do not trust a `customerId` in the body or query, except platform-admin routes under `/api/admin`.
- Success lists use `{ "data": [], "page": { "page": 1, "pageSize": 20, "total": 0 } }`.
- Success items use `{ "data": { } }`.
- Errors use `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [] } }`.
- Every response carries `X-Request-Id`; the same id is in the server log line.
- Timestamps are ISO-8601 in UTC. Identifiers are server-generated ULID strings.
- Module routes sit under `/api/modules/<module-id>/…`. Admin routes sit under `/api/admin/…`.

### Status codes

| Code | When |
| --- | --- |
| 200 | Read or update succeeded |
| 201 | Create succeeded |
| 204 | Logout or delete succeeded, empty body |
| 400 | Validation failed (`VALIDATION_ERROR`) or malformed JSON |
| 401 | Missing or invalid session (`UNAUTHORIZED`) |
| 403 | Signed in, but role or module denied (`FORBIDDEN`, `MODULE_FORBIDDEN`), account disabled, or customer suspended |
| 404 | Resource missing inside the caller's customer, or unknown route (`NOT_FOUND`) |
| 409 | Unique conflict, or a precondition such as `TELEPHONY_NOT_CONFIGURED` |
| 429 | Login rate limit (`RATE_LIMITED`) |
| 502, 503 | An integration (Webinar, telephony) is unavailable or not configured |
| 500 | Unexpected server error. No stack trace in the body |

### Coverage

| Area | Paths |
| --- | --- |
| System | `GET /health` |
| Auth | login, logout, me |
| Admin | customers, customer module contract, users, user module grants, audit log |
| `training-ai` | scenarios, personas, templates, sessions |
| `bdr` | campaigns, lead import and queue summary, dial attempts (automatic, manual, poll, hangup, outcome correction), calls, recordings, meetings, metrics, telephony settings, operator extension |
| Integrations | `POST /api/modules/webinar/handoff` |

Prospecção, Radar, and VSL have no platform routes while they are customer prototypes.

## Viewing the contract

```bash
npx @redocly/cli preview-docs docs/api/openapi.yaml
```

## Changing the contract

1. Edit `openapi.yaml` and, if the rule is cross-cutting, this README.
2. Add or update the Zod schema in the module's `*.schemas.ts`. Constants used by both web and API (module ids, roles, profiles) belong in `packages/shared`.
3. Apply filters in the repository, not in the controller after a full read.
4. Add an integration test under `apps/api/tests`.
