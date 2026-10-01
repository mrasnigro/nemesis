import { Link } from 'react-router-dom'
import { getWebinarApiUrl } from '../config/webinarConfig.js'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'

/** Shared bridging / error gate for Webinar in-app pages. */
export default function WebinarSessionGate({ children }) {
  const { isReady, status, error, ensureSession } = useWebinarSession()
  const apiUrl = getWebinarApiUrl()

  if (status === 'bridging') {
    return (
      <section className="imp-module">
        <div className="training-ai__empty webinar-m1__empty">
          <h3>Conectando ao serviço Webinar…</h3>
          <p>Validando sessão IMP → JWT via <code>{apiUrl}</code>.</p>
          <p className="webinar-launcher__note" style={{ marginTop: '0.75rem' }}>
            Se ficar preso aqui, suba o backend em <code>localhost:3001</code> (
            <code>services/webinar</code>) e aguarde o timeout (~8s) ou tente de novo.
          </p>
        </div>
      </section>
    )
  }

  if (!isReady) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty webinar-m1__empty">
          <h3>Sessão Webinar indisponível</h3>
          <p>{error || 'Não foi possível autenticar na API Webinar.'}</p>
          <p className="webinar-launcher__note" style={{ marginTop: '0.5rem' }}>
            Endpoint: <code>{apiUrl}</code>
          </p>
          <div className="imp-actions">
            <button
              type="button"
              className="imp-btn imp-btn--primary"
              onClick={() => ensureSession({ force: true })}
            >
              Tentar de novo
            </button>
            <Link to="/modules/webinar/overview" className="imp-btn imp-btn--ghost">
              Status da integração
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return children
}
