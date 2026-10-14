import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Resolve the built web app directory for same-process Hostinger-style deploys.
 * Prefers WEB_DIST_DIR, then repo-root `apps/web/dist`, then a sibling of `apps/api`.
 */
export function resolveWebDistDir(): string | null {
  // Integration tests expect JSON 404s from the API process, not the SPA shell.
  if (process.env.NODE_ENV === 'test') return null

  const configured = process.env.WEB_DIST_DIR?.trim()
  const candidates = [
    configured ? path.resolve(configured) : null,
    path.resolve(process.cwd(), 'apps/web/dist'),
    // apps/api/dist/core -> apps/web/dist
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../web/dist'),
  ].filter((value): value is string => Boolean(value))

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'index.html'))) return candidate
  }
  return null
}
