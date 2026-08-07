import { Link } from 'react-router-dom'
import { getWebinarApiUrl, isWebinarServiceConfigured } from '../config/webinarConfig.js'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'

export default function WebinarOverviewPage() {
  const { status, error, session, ensureSession, isReady } = useWebinarSession()
  const apiUrl = getWebinarApiUrl()
  const sidecarConfigured = isWebinarServiceConfigured()

  return (
    <section className="imp-module webinar-page">
      <header className="webinar-page__intro">
        <div>
          <h2>Status da integração</h2>
          <p>
            O Webinar opera <strong>dentro do IMP</strong> (lista, 1:1 BDR, bridge de auth). Studio e
            Live usam o serviço de mídia com deep-link SSO — não é mais o produto principal em outra
            aba.
          </p>
        </div>
      </header>

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Sessão (bridge)</h2>
              <p>IMP → register/exchange → JWT da API</p>
            </div>
          </div>
          <ul className="webinar-m1__status-list">
            <li>
              <span>Status</span>
              <strong>{status}</strong>
            </li>
            <li>
              <span>API</span>
              <strong>
                <code>{apiUrl}</code>
              </strong>
            </li>
            <li>
              <span>Usuário Webinar</span>
              <strong>
                {session?.user?.name || '—'}{' '}
                {session?.user?.role ? `(${session.user.role})` : ''}
              </strong>
            </li>
            <li>
              <span>Email bridge</span>
              <strong>{session?.user?.email || '—'}</strong>
            </li>
          </ul>
          {error ? (
            <p className="webinar-launcher__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="webinar-launcher__actions" style={{ marginTop: '1rem' }}>
            <Link
              to="/modules/webinar"
              className={`imp-btn imp-btn--primary${isReady ? '' : ' is-disabled'}`}
              aria-disabled={!isReady}
              onClick={(event) => {
                if (!isReady) event.preventDefault()
              }}
            >
              Ir ao painel
            </Link>
            <button
              type="button"
              className="imp-btn imp-btn--ghost"
              onClick={() => ensureSession({ force: true })}
            >
              Forçar novo bridge
            </button>
          </div>
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Entrega atual</h2>
              <p>M5 — sidecar não é caminho primário</p>
            </div>
          </div>
          <ol className="webinar-m1__roadmap">
            <li>
              <strong>Feito</strong> — Painel, lista, criação, BDR 1:1, Studio/Live deep-link
            </li>
            <li>
              <strong>Serviço</strong> — API/streaming em <code>services/webinar</code>
            </li>
            <li>
              <strong>Opcional</strong> — port completo do Studio UI (M3c-full)
            </li>
          </ol>
          {sidecarConfigured ? (
            <p className="webinar-launcher__note" style={{ marginTop: '1rem' }}>
              Emergência apenas:{' '}
              <Link to="/modules/webinar/sidecar">abrir FE legado</Link> (fora do menu principal).
            </p>
          ) : (
            <p className="webinar-launcher__note" style={{ marginTop: '1rem' }}>
              Deep-links Studio/Live precisam de <code>VITE_WEBINAR_URL</code>.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
