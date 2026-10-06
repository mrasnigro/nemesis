import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad } from '../hooks/useLoad.js'
import { errorMessage, formatDateTime } from '../utils/format.js'
import StatusPill from '../components/StatusPill.jsx'
import { PLATFORM_BASE } from '../PlatformLayout.jsx'

const PAGE_SIZE = 15

export default function PlatformWebinars() {
  const [filters, setFilters] = useState({ q: '', status: '', mine: false, sort: '-scheduledAt', page: 1 })
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setFilters((prev) => (prev.q === search ? prev : { ...prev, q: search, page: 1 })), 300)
    return () => clearTimeout(timer)
  }, [search])

  const list = useLoad(
    () =>
      webinarApi.listWebinars({
        q: filters.q,
        status: filters.status,
        mine: filters.mine,
        sort: filters.sort,
        page: filters.page,
        pageSize: PAGE_SIZE,
      }),
    [filters.q, filters.status, filters.mine, filters.sort, filters.page],
  )

  const rows = list.data?.data || []
  const total = list.data?.page?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))

  return (
    <section className="imp-module">
      <header className="webinar-page-header">
        <div>
          <h2>Webinars</h2>
          <p>Todos os webinars da sua conta.</p>
        </div>
        <Link to={`${PLATFORM_BASE}/webinars/novo`} className="imp-btn imp-btn--primary">
          + Novo webinar
        </Link>
      </header>

      <div className="imp-panel">
        <div className="webinar-form__row webinar-filters webinar-filters--4">
          <label className="imp-field">
            <span>Buscar</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título ou apresentador" />
          </label>
          <label className="imp-field">
            <span>Situação</span>
            <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
              <option value="">Todas</option>
              <option value="draft">Rascunho</option>
              <option value="scheduled">Agendado</option>
              <option value="live">Ao vivo</option>
              <option value="completed">Encerrado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>
          <label className="imp-field">
            <span>Ordem</span>
            <select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
              <option value="-scheduledAt">Data (mais recentes)</option>
              <option value="scheduledAt">Data (mais antigos)</option>
              <option value="title">Título (A–Z)</option>
            </select>
          </label>
          <label className="webinar-toggle webinar-toggle--field">
            <input type="checkbox" checked={filters.mine} onChange={(event) => setFilter('mine', event.target.checked)} />
            Só os meus
          </label>
        </div>

        {list.error ? <p className="webinar-note webinar-note--error">{errorMessage(list.error)}</p> : null}
        {list.loading && !list.data ? <p className="webinar-note">Carregando…</p> : null}
        {list.data && rows.length === 0 ? (
          <div className="imp-empty">
            {filters.q || filters.status || filters.mine ? 'Nenhum webinar com esses filtros.' : 'Nenhum webinar criado ainda.'}
          </div>
        ) : null}

        {rows.length > 0 ? (
          <>
            <table className="imp-table">
              <thead>
                <tr>
                  <th>Webinar</th>
                  <th>Data</th>
                  <th>Duração</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((webinar) => (
                  <tr key={webinar.id}>
                    <td>
                      <Link to={`${PLATFORM_BASE}/webinars/${webinar.id}`} className="webinar-link">
                        {webinar.title}
                      </Link>
                      {webinar.presenterName ? <small className="webinar-table__sub">{webinar.presenterName}</small> : null}
                    </td>
                    <td>{formatDateTime(webinar.scheduledAt, webinar.timezone)}</td>
                    <td>{webinar.durationMinutes} min</td>
                    <td>
                      <StatusPill status={webinar.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="webinar-pager">
              <button
                type="button"
                className="imp-btn imp-btn--ghost"
                disabled={filters.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                ← Anterior
              </button>
              <span>
                Página {filters.page} de {pages} · {total} webinar{total === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                className="imp-btn imp-btn--ghost"
                disabled={filters.page >= pages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Próxima →
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
