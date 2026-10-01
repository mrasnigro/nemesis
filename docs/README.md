# IMP documentation

Start here when changing structure, adding a module, or extending the platform API.

| Document | What it decides |
| --- | --- |
| [architecture/overview.md](architecture/overview.md) | System shape, module tracks, access model, tenancy, naming |
| [frontend/structure.md](frontend/structure.md) | `apps/web` layout, module folders, data modes, file names |
| [backend/structure.md](backend/structure.md) | `apps/api` layout and layer rules, and the Webinar service |
| [api/README.md](api/README.md) | Platform API conventions |
| [api/openapi.yaml](api/openapi.yaml) | Platform API contract. Every path in it is implemented |
| [api/webinar.md](api/webinar.md) | Webinar service routes and the IMP handoff |
| [status/project-map.md](status/project-map.md) | Repository and runtime as they exist today |
| [status/prototype-status.md](status/prototype-status.md) | Which modules are production, which are still customer prototypes |
| [status/removal-register.md](status/removal-register.md) | What to delete later, and the condition that makes each deletion safe |

## Status labels

| Label | Meaning |
| --- | --- |
| **As built** | Matches the repository now |
| **Target** | Agreed structure. Do not describe it as deployed |

## Historical notes

These remain for context and are not the structure standard:

- `IMP_PLATFORM_ARCHITECTURE_V1.md` — shell vs Webinar sidecar after the first integration
- `IMP_PLATFORM_TECHNICAL_HANDOVER.md` — early prototype handover
- `IMP_CLIENT_DEMO_VALIDATION.md` — demo flows and mock logins (mock logins no longer exist)
- `BDR_*.md`, `TRAINING_AI_*.md` — analysis and specs written before the API existed
- `WEBINAR_*.md` — Webinar integration and production notes (written while Webinar ran on SQLite and the handoff key was in the browser; both have changed)
