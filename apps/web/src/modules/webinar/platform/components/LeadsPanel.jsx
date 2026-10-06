import { useEffect, useState } from 'react'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad } from '../hooks/useLoad.js'
import { errorMessage, formatDateTime } from '../utils/format.js'
import StatusPill from './StatusPill.jsx'

const PAGE_SIZE = 20

/** People registered for one webinar: filter, change status, remove, export. */
export default function LeadsPanel({ webinarId, canEdit }) {
  const [filters, setFilters] = useState({ q: '', status: '', page: 1 })
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState({ kind: '', text: '' })
  const [busy, setBusy] = useState(false)

  // Typing updates the box at once; the list is asked for only after a short pause.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((prev) => (prev.q === search ? prev : { ...prev, q: search, page: 1 })), 300)
    return () => clearTimeout(timer)
  }, [search])

  const leads = useLoad(
    () => webinarApi.listLeads(webinarId, { q: filters.q, status: filters.status, page: filters.page, pageSize: PAGE_SIZE }),
    [webinarId, filters.q, filters.status, filters.page],
  )
  const stats = useLoad(() => webinarApi.leadStats(webinarId), [webinarId])

  const rows = leads.data?.data || []
  const total = leads.data?.page?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const setFilter = (key) => (event) => setFilters((prev) => ({ ...prev, [key]: event.target.value, page: 1 }))

  async function run(action, failure) {
    setBusy(true)
    setNotice({ kind: '', text: '' })
    try {
      await action()
      await Promise.all([leads.reload(), stats.reload()])
    } catch (err) {
      setNotice({ kind: 'error', text: errorMessage(err, failure) })
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = (lead, status) =>
    run(() => webinarApi.updateLead(webinarId, lead.id, status), 'Não foi possível atualizar o lead.')

  const remove = (lead) => {
    if (!window.confirm(`Remover ${lead.name} da lista de leads?`)) return
    run(() => webinarApi.deleteLead(webinarId, lead.id), 'Não foi possível remover o lead.')
  }

  const exportCsv = () => run(() => webinarApi.exportLeads(webinarId), 'Não foi possível exportar os leads.')

  const s = stats.data

  return (
    <div className="imp-panel">
      <div className="imp-panel__header">
        <div>
          <h3>Leads</h3>
          <p>Quem se inscreveu neste webinar.</p>
        </div>
        <button type="button" className="imp-btn imp-btn--ghost" onClick={exportCsv} disabled={busy || total === 0}>
          Exportar CSV
        </button>
      </div>

      {s ? (
        <div className="webinar-stats">
          <span>
            <strong>{s.total}</strong> inscritos
          </span>
          <span>
            <strong>{s.attended}</strong> presentes
          </span>
          <span>
            <strong>{s.noShow}</strong> faltaram
          </span>
          <span>
            <strong>{s.attendanceRate}%</strong> de presença
          </span>
          <span>
            <strong>{s.totalMessages}</strong> mensagens
          </span>
        </div>
      ) : null}

      <div className="webinar-form__row webinar-filters">
        <label className="imp-field">
          <span>Buscar</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou e-mail" />
        </label>
        <label className="imp-field">
          <span>Situação</span>
          <select value={filters.status} onChange={setFilter('status')}>
            <option value="">Todas</option>
            <option value="registered">Inscrito</option>
            <option value="attended">Presente</option>
            <option value="no_show">Faltou</option>
          </select>
        </label>
      </div>

      {notice.text ? <p className="webinar-note webinar-note--error">{notice.text}</p> : null}
      {leads.error ? <p className="webinar-note webinar-note--error">{errorMessage(leads.error)}</p> : null}
      {leads.loading && !leads.data ? <p className="webinar-note">Carregando…</p> : null}
      {leads.data && rows.length === 0 ? <div className="imp-empty">Nenhum lead encontrado.</div> : null}

      {rows.length > 0 ? (
        <>
          <table className="imp-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Inscrição</th>
                <th>Msgs</th>
                <th>Situação</th>
                {canEdit ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.name}</td>
                  <td>
                    {lead.email}
                    {lead.phone ? <small className="webinar-table__sub">{lead.phone}</small> : null}
                  </td>
                  <td>
                    {formatDateTime(lead.registeredAt)}
                    {lead.attendedAt ? <small className="webinar-table__sub">Entrou {formatDateTime(lead.attendedAt)}</small> : null}
                  </td>
                  <td>{lead.messageCount ?? 0}</td>
                  <td>
                    {canEdit ? (
                      <select
                        value={lead.status}
                        onChange={(event) => changeStatus(lead, event.target.value)}
                        disabled={busy}
                        aria-label={`Situação de ${lead.name}`}
                        className="webinar-table__select"
                      >
                        <option value="registered">Inscrito</option>
                        <option value="attended">Presente</option>
                        <option value="no_show">Faltou</option>
                      </select>
                    ) : (
                      <StatusPill kind="lead" status={lead.status} />
                    )}
                  </td>
                  {canEdit ? (
                    <td className="webinar-table__actions">
                      <button type="button" className="imp-btn imp-btn--ghost" onClick={() => remove(lead)} disabled={busy}>
                        Remover
                      </button>
                    </td>
                  ) : null}
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
              Página {filters.page} de {pages} · {total} lead{total === 1 ? '' : 's'}
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
  )
}
