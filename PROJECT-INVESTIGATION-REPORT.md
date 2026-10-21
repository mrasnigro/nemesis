# IMP Platform Project Investigation Report

**Date:** 2026-10-22

## Executive summary

IMP Platform is a browser-based, multi-tenant workspace for sales operations. Its React/Vite web shell provides authenticated, role- and entitlement-gated access to sales and enablement modules, with a Node/Express and MySQL platform API. Webinar is a separately deployable product integrated into that shell. The user-facing brand currently presents itself as **CRM IMP / Sistema de Gestão de Leads**.

The repository builds successfully and the web smoke tests pass. The most actionable issues found are stale/broken documentation links in the root README and a production JavaScript bundle that exceeds Vite's recommended chunk size. The API integration tests could not be run because no MySQL server was listening locally; this is an environment limitation, not evidence of a failing test.

## Project and site overview

- **Web app:** `apps/web`, built with React 19, Vite, and React Router. Authentication and protected routes present different pages according to the user's role and module entitlements.
- **Platform API:** `apps/api`, built with Node, Express, TypeScript, MySQL, and Zod.
- **Shared package:** `packages/shared`, containing module identifiers, roles, profiles, and entitlement rules.
- **Webinar product:** `services/webinar`, with its own frontend/backend and database, linked into the IMP web shell.
- **Main workspace modules:** Treinamento IA, Discagem Automática (BDR), Prospecção, Webinar, Radar de Tendências, and VSL.
- **Intended audience:** internal IMP staff and customer sales teams, with customer/module access controlled by account and user permissions.

## Findings

| Priority | Finding | Evidence and impact |
|---|---|---|
| Medium | Root README points to documentation files that are absent. | The documentation table in `README.md` links to `docs/architecture/overview.md`, `docs/frontend/structure.md`, `docs/backend/structure.md`, `docs/api/README.md`, `docs/api/openapi.yaml`, `docs/api/webinar.md`, and three `docs/status/*.md` files. These referenced paths were checked and are absent, so those links do not work for contributors. |
| Medium | Production web bundle is unusually large. | `npm run build` succeeds, but Vite reports a minified JavaScript chunk of **1,066.87 kB**, over its 500 kB warning threshold. This may increase initial download and parse time; consider route/module code splitting. |
| Low | Lint reports unnecessary array spreads in Webinar stream iteration. | `apps/api/src/modules/webinar/stream.hub.ts` has `unicorn(no-useless-spread)` warnings at lines 136, 146, 176, 207, and 219. Lint exits successfully; these are cleanup/performance warnings, not demonstrated runtime defects. |
| Low | Browser title and description still describe the product as a lead-management CRM. | `apps/web/index.html` sets the title to “CRM IMP - Sistema de Gestão de Leads” and repeats that description, while the root project documentation describes the broader IMP Platform workspace. This is a branding/metadata inconsistency if the intended public identity is IMP Platform; the app's visible shell also uses CRM IMP branding, so this may be intentional. |

## Verification

- `npm run build` — **passed** for the API TypeScript build and web production build; Vite emitted the large-chunk warning above.
- `npm run lint` — **passed** with warnings, including the Webinar stream spread warnings above.
- `npm test` — **partially passed**: all 7 web smoke suites and all 3 shared-package tests passed. API integration tests could not initialize because connecting to `127.0.0.1:3306` returned `ECONNREFUSED`. The README documents that these tests require the MySQL `imp_test` database; this environment did not have the database service running.
- Working tree was clean before validation; generated build output did not leave tracked changes.

## Recommended follow-up

1. Restore the linked documentation files or update the README table to reference existing documentation.
2. Split the web bundle along route/module boundaries and measure the resulting initial chunk.
3. Optionally clean up the unnecessary iterable spreads in the Webinar stream hub.
4. Decide whether the public title/description should remain CRM IMP or be updated to reflect the IMP Platform product identity.
5. Start the local MySQL test service and rerun `npm test` to complete API integration coverage.
