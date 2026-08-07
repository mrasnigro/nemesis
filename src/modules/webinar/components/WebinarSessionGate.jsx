import { Link } from 'react-router-dom'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'

/** Shared bridging / error gate for Webinar in-app pages. */
export default function WebinarSessionGate({ children }) {
  const { isReady, status, error, ensureSession } = useWebinarSession()

  if (status === 'bridging') {
    return (
      <section className="imp-module">
        <div className="training-ai__empty webinar-m1__empty">
          <h3>Conectando ao serviço Webinar…</h3>
          <p>Validando sessão IMP → JWT.</p>
        </div>
      </section>
    )
  }

  if (!isReady) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty webinar-m1__empty">
          <h3>Sessão Webinar indisponível</h3>
          <p>
            {error ||
              'Confirme a API em :3001 e o proxy /webinar-api, depois tente de novo.'}
          </p>
          <div className="imp-actions">
            <button
              type="button"
              className="imp-btn imp-btn--primary"
              onClick={() => ensureSession({ force: true })}
            >
              Tentar de novo
            </button>
            <Link to="/modules/webinar/sidecar" className="imp-btn imp-btn--ghost">
              Sidecar legado
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return children
}
