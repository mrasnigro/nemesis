import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import WebinarSessionGate from '../components/WebinarSessionGate.jsx'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'
import {
  formatWebinarWhen,
  normalizeWebinarList,
  webinarStatusLabel,
  webinarStatusTone,
} from '../utils/webinarNormalize.js'

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'live', label: 'Ao vivo' },
  { id: 'scheduled', label: 'Agendados' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'completed', label: 'Concluídos' },
]

export default function WebinarListPage() {
  const { apiGet, ensureSession, status } = useWebinarSession()
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (status === 'idle' || status === 'error') void ensureSession()
  }, [ensureSession, status])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      setNotice('')
      try {
        const payload = await apiGet('/client/webinars')
        if (cancelled) return
        setItems(normalizeWebinarList(payload))
      } catch (err) {
        if (cancelled) return
        setItems([])
        setError(err instanceof Error ? err.message : 'Falha ao listar webinars')
        setNotice('A lista ficará vazia até a API responder.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [apiGet])

  const visible = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.status === filter)
  }, [filter, items])

  return (
    <WebinarSessionGate>
      <section className="imp-module webinar-page">
        <header className="webinar-page__intro webinar-page__intro--row">
          <div>
            <h2>Meus webinars</h2>
            <p>Lista do cliente via API — port M3a no shell IMP.</p>
          </div>
          <div className="training-ai__page-header-actions">
            <Link to="/modules/webinar/app" className="imp-btn imp-btn--ghost">
              ← Painel
            </Link>
            <Link to="/modules/webinar/webinars/novo" className="imp-btn imp-btn--primary">
              Novo webinar
            </Link>
          </div>
        </header>

        <div className="webinar-m3__filters" role="tablist" aria-label="Filtrar por status">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={`webinar-m3__filter ${filter === item.id ? 'is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? <p className="webinar-launcher__note">Carregando…</p> : null}
        {error ? (
          <p className="webinar-launcher__error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? <p className="webinar-launcher__note">{notice}</p> : null}

        {visible.length ? (
          <ul className="webinar-m3__cards">
            {visible.map((item) => (
              <li key={item.id} className="webinar-m3__card">
                <div className="webinar-m3__card-top">
                  <h3>{item.title}</h3>
                  <span className={`imp-pill imp-pill--${webinarStatusTone(item.status)}`}>
                    {webinarStatusLabel(item.status)}
                  </span>
                </div>
                {item.description ? (
                  <p className="webinar-m3__card-desc">{item.description}</p>
                ) : null}
                <dl className="webinar-m3__meta">
                  <div>
                    <dt>Quando</dt>
                    <dd>{formatWebinarWhen(item.scheduledDate)}</dd>
                  </div>
                  <div>
                    <dt>Duração</dt>
                    <dd>{item.durationMinutes ? `${item.durationMinutes} min` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Apresentador</dt>
                    <dd>{item.presenterName || '—'}</dd>
                  </div>
                </dl>
                <div className="webinar-m3__card-actions">
                  <Link
                    to={`/modules/webinar/webinars/${item.id}`}
                    className="imp-btn imp-btn--primary"
                  >
                    Ver detalhes
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : !loading ? (
          <div className="training-ai__empty webinar-m1__empty">
            <h3>Nenhum webinar neste filtro</h3>
            <p>Crie um rascunho ou ajuste o filtro de status.</p>
            <div className="imp-actions">
              <Link to="/modules/webinar/webinars/novo" className="imp-btn imp-btn--primary">
                Novo webinar
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </WebinarSessionGate>
  )
}
