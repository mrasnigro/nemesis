# IMP Platform

IMP is the commercial workspace shell for AI-assisted sales operations. One login opens the modules a customer is entitled to: Treinamento IA, Discagem Automática, Prospecção, Radar de Tendências, VSL, and Webinar.

The shell is a React + Vite app at the repository root. Webinar is a separate Node service under `services/webinar` (Express, TypeScript, MySQL). The platform API for the other modules is specified and not built yet.

## Documentation

| Topic | Document |
| --- | --- |
| How the system fits together | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Frontend structure and names | [docs/frontend/structure.md](docs/frontend/structure.md) |
| Backend structure and names | [docs/backend/structure.md](docs/backend/structure.md) |
| Platform API contract | [docs/api/README.md](docs/api/README.md) |
| Webinar API (running today) | [docs/api/webinar.md](docs/api/webinar.md) |
| Current project map | [docs/status/project-map.md](docs/status/project-map.md) |
| Prototype status | [docs/status/prototype-status.md](docs/status/prototype-status.md) |
| Later removals | [docs/status/removal-register.md](docs/status/removal-register.md) |
| Document index | [docs/README.md](docs/README.md) |

Older notes in `docs/` (handover, demo validation, Webinar integration) describe earlier milestones. The files above are the structure standard for ongoing work.

## Repository

```text
imp-platform/
├── src/                  # IMP shell (React + Vite)
├── services/webinar/     # Webinar frontend, backend, and database
├── docs/                 # Architecture, structure, and API docs
├── index.html
├── package.json          # Shell scripts: dev, build, lint, preview
└── vite.config.js
```

When `apps/api` is added, the shell moves once to `apps/web`. Until then, `src/` stays the frontend source folder. See the architecture overview.

## Run the shell

```bash
npm install
npm run dev
```

## Run Webinar

From `services/webinar/`, follow [services/webinar/README.md](services/webinar/README.md). The shell proxies `/webinar-api` to that backend in development (`vite.config.js`).
