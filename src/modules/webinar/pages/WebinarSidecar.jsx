import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import {
  getWebinarApiUrl,
  getWebinarServiceUrl,
  isWebinarServiceConfigured,
} from '../config/webinarConfig.js'
import { launchWebinarWithImpSession } from '../services/impHandoff.js'
import { launchWebinarService } from '../services/webinarLauncher.js'

const REASON_COPY = {
  missing_url: 'URL do Webinar não configurada. Defina VITE_WEBINAR_URL no ambiente do IMP.',
  invalid_url: 'URL do Webinar inválida. Use um endereço http(s) absoluto.',
  popup_blocked: 'O navegador bloqueou a nova aba. Permita pop-ups para este site e tente novamente.',
  missing_api_url: 'API do Webinar não configurada.',
  register_failed: 'Não foi possível registrar o handoff SSO. Abrindo sem login automático.',
  network_error: 'Webinar API inacessível para mint do handoff.',
}

/** Legacy / fallback: open separate Webinar FE in a new tab (pre-merge). */
export default function WebinarSidecarPage() {
  const { user, isAuthenticated } = useAuth()
  const configured = isWebinarServiceConfigured()
  const serviceUrl = getWebinarServiceUrl()
  const apiUrl = getWebinarApiUrl()
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLaunch() {
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (isAuthenticated && user?.username) {
        const result = await launchWebinarWithImpSession({
          username: user.username,
          name: user.name,
          role: user.role,
          profile: user.profile,
          returnTo: `${window.location.origin}/modules/webinar`,
        })

        if (!result.ok) {
          setError(REASON_COPY[result.reason] || 'Não foi possível abrir o Webinar.')
          return
        }

        if (result.handoff) {
          setInfo('Handoff SSO registrado — sidecar deve autenticar automaticamente.')
        } else if (result.handoffError) {
          setInfo(
            `${REASON_COPY[result.handoffError] || 'Handoff indisponível.'} ${
              result.handoffDetail ? `(${result.handoffDetail})` : ''
            }`.trim(),
          )
        }
        return
      }

      const result = launchWebinarService()
      if (!result.ok) {
        setError(REASON_COPY[result.reason] || 'Não foi possível abrir o Webinar.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="imp-module webinar-page webinar-launcher">
      <header className="webinar-page__intro">
        <div>
          <h2>Fallback · sidecar</h2>
          <p>
            Abre o frontend legado em nova aba. Preferência do produto: painel{' '}
            <Link to="/modules/webinar/app">in-app</Link>.
          </p>
        </div>
      </header>

      <div className="imp-panel webinar-launcher__panel">
        <p className="webinar-launcher__status">
          {configured ? (
            <>
              FE sidecar
              <span className="webinar-launcher__url" title={serviceUrl}>
                {serviceUrl}
              </span>
            </>
          ) : (
            <>
              Configure <code>VITE_WEBINAR_URL</code> para o fallback.
            </>
          )}
        </p>
        <p className="webinar-launcher__note">
          Bridge API (in-app): <code>{apiUrl}</code>
        </p>

        <div className="webinar-launcher__actions">
          <button
            type="button"
            className="imp-btn imp-btn--primary"
            onClick={handleLaunch}
            disabled={!configured || busy}
          >
            {busy ? 'Abrindo…' : 'Abrir sidecar (SSO)'}
          </button>
          <Link to="/modules/webinar/app" className="imp-btn imp-btn--ghost">
            Ir ao painel in-app
          </Link>
        </div>

        {error ? (
          <p className="webinar-launcher__error" role="alert">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="webinar-launcher__note" role="status">
            {info}
          </p>
        ) : null}
      </div>
    </section>
  )
}
