/**
 * Prefix for in-app routes when Webinar FE is mounted under IMP.
 * Empty in standalone FE (`services/webinar/frontend` on :3000).
 */
export function getAppBase(): string {
  const raw = import.meta.env.VITE_WEBINAR_APP_BASE
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/\/$/, '')
}

/** Absolute app path, e.g. appPath('/dashboard') → '/modules/webinar/dashboard' when embedded. */
export function appPath(path: string): string {
  const base = getAppBase()
  const p = String(path || '/').startsWith('/') ? String(path) : `/${path}`
  return `${base}${p}`
}

/** True when running inside IMP embed (base path set). */
export function isEmbeddedInImp(): boolean {
  return getAppBase().length > 0
}

/** Login target — IMP `/login` when embedded; Webinar `/login` when standalone (same URL shape). */
export function loginPath(): string {
  return '/login'
}
