import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'

/**
 * M1 in-app panel — proves API + bridge inside IMP.
 * Full Webinar FE port lands in M3.
 */
export default function WebinarAppDashboardPage() {
  const { isReady, status, error, ensureSession, session, apiGet } = useWebinarSession()
  const [health, setHealth] = useState(null)
  const [webinars, setWebinars] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'idle' || status === 'error') {
      void ensureSession()
    }
  }, [ensureSession, status])

  useEffect(() => {
    if (!isReady) return undefined
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        // Health is unauthenticated on backend root — try via proxy rewrite /webinar-api → /api
        // Backend health is GET /health not under /api — optional skip
        let list = null
        try {
          list = await apiGet('/client/webinars')
        } catch (err) {
          // Some installs use alternate paths; keep panel useful with me-only.
          list = { items: [], notice: err.message }
        }

        let me = null
        try {
          me = await apiGet('/auth/me')
        } catch {
          me = session?.user || null
        }

        if (!cancelled) {
          setHealth(me)
          setWebinars(list)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Falha ao carregar painel')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [apiGet, isReady, session?.user])

  if (status === 'bridging') {
    return (
      <section className="imp-module">
        <div className="training-ai__empty webinar-m1__empty">
          <h3>Conectando ao serviço Webinar…</h3>
          <p>Registrando handoff e obtendo JWT.</p>
        </div>
      </section>
    )
  }

  if (!isReady) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty webinar-m1__empty">
          <h3>Painel indisponível</h3>
          <p>
            {error ||
              'Não foi possível autenticar no backend Webinar. Confirme o sidecar API (:3001) e o proxy /webinar-api.'}
          </p>
          <div className="imp-actions">
            <button type="button" className="imp-btn imp-btn--primary" onClick={() => ensureSession()}>
              Tentar de novo
            </button>
            <Link to="/modules/webinar/sidecar" className="imp-btn imp-btn--ghost">
              Fallback sidecar
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const items = Array.isArray(webinars)
    ? webinars
    : webinars?.items || webinars?.data || webinars?.webinars || []

  return (
    <section className="imp-module webinar-page">
      <header className="webinar-page__intro">
        <div>
          <h2>Painel Webinar (in-app)</h2>
          <p>
            Sessão bridged como <strong>{session?.user?.email}</strong>. Lista abaixo vem da API
            do serviço — UI completa (studio/live) entra no M3.
          </p>
        </div>
        <div className="training-ai__page-header-actions">
          <Link to="/modules/webinar" className="imp-btn imp-btn--ghost">
            ← Visão geral
          </Link>
        </div>
      </header>

      <div className="imp-panel" style={{ marginBottom: '1rem' }}>
        <div className="imp-panel__header">
          <div>
            <h2>Identidade</h2>
            <p>GET /auth/me (ou cache do bridge)</p>
          </div>
        </div>
        <pre className="webinar-m1__pre">
          {JSON.stringify(health || session?.user || {}, null, 2)}
        </pre>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Webinars do cliente</h2>
            <p>GET /client/webinars</p>
          </div>
        </div>
        {loading ? <p className="webinar-launcher__note">Carregando…</p> : null}
        {loadError ? (
          <p className="webinar-launcher__error" role="alert">
            {loadError}
          </p>
        ) : null}
        {webinars?.notice ? (
          <p className="webinar-launcher__note">AVISO API: {webinars.notice}</p>
        ) : null}
        {items.length ? (
          <ul className="webinar-m1__list">
            {items.map((item) => (
              <li key={item.id || item.title}>
                <strong>{item.title || item.name || `Webinar #${item.id}`}</strong>
                <span className="webinar-launcher__note">
                  {item.status || item.state || '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="training-ai__empty webinar-m1__empty">
            <h3>Nenhum webinar retornado</h3>
            <p>
              Bridge OK. Quando houver dados na API, aparecerão aqui. Studio/Live serão portados
              no M3.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
