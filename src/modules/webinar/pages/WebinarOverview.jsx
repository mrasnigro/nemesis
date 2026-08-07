import { Link } from 'react-router-dom'
import { getWebinarApiUrl } from '../config/webinarConfig.js'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'

export default function WebinarOverviewPage() {
  const { status, error, session, ensureSession, isReady } = useWebinarSession()
  const apiUrl = getWebinarApiUrl()

  return (
    <section className="imp-module webinar-page">
      <header className="webinar-page__intro">
        <div>
          <h2>Webinar · integrado ao IMP</h2>
          <p>
            M1 scaffold: autenticação e painel rodam <strong>dentro</strong> do shell IMP. O
            backend/streaming continua em <code>services/webinar</code>. A aba sidecar fica só
            como fallback.
          </p>
        </div>
      </header>

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Sessão Webinar (bridge)</h2>
              <p>IMP user → handoff register/exchange → JWT (sem nova aba)</p>
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
            <button type="button" className="imp-btn imp-btn--ghost" onClick={() => ensureSession()}>
              Re-sincronizar sessão
            </button>
            <Link
              to="/modules/webinar/app"
              className={`imp-btn imp-btn--primary${isReady ? '' : ' is-disabled'}`}
              aria-disabled={!isReady}
              onClick={(event) => {
                if (!isReady) event.preventDefault()
              }}
            >
              Abrir painel in-app
            </Link>
          </div>
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Roadmap merge</h2>
              <p>Próximos passos após M1</p>
            </div>
          </div>
          <ol className="webinar-m1__roadmap">
            <li>
              <strong>M2</strong> — Bridge estável; login Webinar desnecessário no fluxo IMP
            </li>
            <li>
              <strong>M3</strong> — Portar client / live / studio de{' '}
              <code>services/webinar/frontend</code>
            </li>
            <li>
              <strong>M4</strong> — CTA BDR “Reunião 1:1” → sala no IMP
            </li>
            <li>
              <strong>M5</strong> — Aposentar sidecar FE como caminho principal
            </li>
          </ol>
          <p className="webinar-launcher__note">
            Detalhes: <code>docs/WEBINAR_IMP_INTEGRATION_NEXT_STEPS.md</code>
          </p>
        </div>
      </div>
    </section>
  )
}
