import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WebinarSessionGate from '../components/WebinarSessionGate.jsx'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'
import {
  formatWebinarWhen,
  normalizeWebinarList,
  webinarStatusLabel,
  webinarStatusTone,
} from '../utils/webinarNormalize.js'

/**
 * In-app hub (default `/modules/webinar`).
 */
export default function WebinarAppDashboardPage() {
  const { ensureSession, status, session, apiGet } = useWebinarSession()
  const [preview, setPreview] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'idle' || status === 'error') void ensureSession()
  }, [ensureSession, status])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const payload = await apiGet('/client/webinars')
        if (!cancelled) setPreview(normalizeWebinarList(payload).slice(0, 5))
      } catch (err) {
        if (!cancelled) {
          setPreview([])
          setLoadError(err instanceof Error ? err.message : 'Falha ao carregar')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (status === 'ready') void load()
    return () => {
      cancelled = true
    }
  }, [apiGet, status])

  return (
    <WebinarSessionGate>
      <section className="imp-module webinar-page">
        <header className="webinar-page__intro webinar-page__intro--row">
          <div>
            <h2>Painel Webinar</h2>
            <p>
              Integrado ao IMP ·{' '}
              <strong>{session?.user?.email || session?.user?.name || '—'}</strong>
            </p>
          </div>
          <div className="training-ai__page-header-actions">
            <Link to="/modules/webinar/webinars" className="imp-btn imp-btn--primary">
              Meus webinars
            </Link>
            <Link to="/modules/webinar/webinars/novo" className="imp-btn imp-btn--ghost">
              Novo
            </Link>
          </div>
        </header>

        <div className="imp-grid-2">
          <div className="imp-panel">
            <div className="imp-panel__header">
              <div>
                <h2>Recentes</h2>
                <p>Abra o detalhe para Studio/Live ou volte ao BDR se veio de um 1:1</p>
              </div>
            </div>
            {loading ? <p className="webinar-launcher__note">Carregando…</p> : null}
            {loadError ? (
              <p className="webinar-launcher__error" role="alert">
                {loadError}
              </p>
            ) : null}
            {preview.length ? (
              <ul className="webinar-m3__compact-list">
                {preview.map((item) => (
                  <li key={item.id}>
                    <Link to={`/modules/webinar/webinars/${item.id}`}>
                      <strong>{item.title}</strong>
                      <span>
                        <span className={`imp-pill imp-pill--${webinarStatusTone(item.status)}`}>
                          {webinarStatusLabel(item.status)}
                        </span>{' '}
                        {formatWebinarWhen(item.scheduledDate)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : !loading ? (
              <div className="training-ai__empty webinar-m1__empty">
                <h3>Sem webinars ainda</h3>
                <p>Crie um rascunho ou inicie uma reunião 1:1 a partir do BDR.</p>
                <div className="imp-actions">
                  <Link to="/modules/webinar/webinars/novo" className="imp-btn imp-btn--primary">
                    Novo webinar
                  </Link>
                  <Link to="/modules/bdr/agendamentos" className="imp-btn imp-btn--ghost">
                    Agendamentos BDR
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <div className="imp-panel">
            <div className="imp-panel__header">
              <div>
                <h2>Como usar</h2>
                <p>Fluxo principal no shell IMP</p>
              </div>
            </div>
            <ol className="webinar-m1__roadmap">
              <li>
                <strong>Listar / criar</strong> em Meus webinars
              </li>
              <li>
                <strong>1:1</strong> a partir de BDR → Agendamentos
              </li>
              <li>
                <strong>Studio / Live</strong> no detalhe (abre o serviço de mídia autenticado)
              </li>
            </ol>
            <div className="webinar-launcher__actions" style={{ marginTop: '1rem' }}>
              <Link to="/modules/webinar/overview" className="imp-btn imp-btn--ghost">
                Status da integração
              </Link>
            </div>
          </div>
        </div>
      </section>
    </WebinarSessionGate>
  )
}
