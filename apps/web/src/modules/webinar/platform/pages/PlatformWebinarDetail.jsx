import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad } from '../hooks/useLoad.js'
import { useCanEdit } from '../hooks/useCanEdit.js'
import { STATUS_ACTIONS, errorMessage, formatDateTime } from '../utils/format.js'
import StatusPill from '../components/StatusPill.jsx'
import AccessCodesPanel from '../components/AccessCodesPanel.jsx'
import LeadsPanel from '../components/LeadsPanel.jsx'
import StaffChatPanel from '../components/StaffChatPanel.jsx'
import { PLATFORM_BASE } from '../PlatformLayout.jsx'

const TABS = [
  { id: 'codes', label: 'Códigos de acesso' },
  { id: 'leads', label: 'Leads' },
  { id: 'chat', label: 'Chat' },
]

export default function PlatformWebinarDetail() {
  const { webinarId } = useParams()
  const navigate = useNavigate()
  const canEditWebinar = useCanEdit()
  const { data: webinar, error, loading, reload } = useLoad(() => webinarApi.getWebinar(webinarId), [webinarId])
  const [tab, setTab] = useState('codes')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  if (loading && !webinar) {
    return (
      <section className="imp-module">
        <p className="webinar-note">Carregando…</p>
      </section>
    )
  }
  if (error && !webinar) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          {error.status === 404 ? 'Webinar não encontrado.' : errorMessage(error)}
          <div className="imp-actions webinar-center">
            <Link to={`${PLATFORM_BASE}/webinars`} className="imp-btn imp-btn--ghost">
              ← Voltar
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const canEdit = canEditWebinar(webinar)
  const actions = canEdit ? STATUS_ACTIONS[webinar.status] || [] : []

  async function changeStatus(to, label) {
    if (to === 'cancelled' && !window.confirm('Cancelar este webinar? Os inscritos não poderão mais entrar na sala.')) return
    setBusy(true)
    setNotice('')
    try {
      await webinarApi.setStatus(webinar.id, to)
      await reload()
    } catch (err) {
      setNotice(errorMessage(err, `Não foi possível: ${label.toLowerCase()}.`))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Excluir "${webinar.title}"? Os códigos deixam de funcionar. Esta ação não pode ser desfeita.`)) return
    setBusy(true)
    setNotice('')
    try {
      await webinarApi.deleteWebinar(webinar.id)
      navigate(`${PLATFORM_BASE}/webinars`, { replace: true })
    } catch (err) {
      setNotice(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <section className="imp-module">
      <header className="webinar-page-header">
        <div>
          <p className="webinar-breadcrumb">
            <Link to={`${PLATFORM_BASE}/webinars`}>← Webinars</Link>
          </p>
          <h2>
            {webinar.title} <StatusPill status={webinar.status} />
          </h2>
          <p>
            {formatDateTime(webinar.scheduledAt, webinar.timezone)} · {webinar.durationMinutes} min
            {webinar.presenterName ? ` · ${webinar.presenterName}` : ''}
          </p>
        </div>
        {canEdit ? (
          <div className="imp-actions">
            {actions.map((action) => (
              <button
                key={action.to}
                type="button"
                className={`imp-btn ${action.primary ? 'imp-btn--primary' : 'imp-btn--ghost'}`}
                disabled={busy}
                onClick={() => changeStatus(action.to, action.label)}
              >
                {action.label}
              </button>
            ))}
            {webinar.status === 'draft' || webinar.status === 'scheduled' || webinar.status === 'live' ? (
              <Link to={`${PLATFORM_BASE}/webinars/${webinar.id}/estudio`} className="imp-btn imp-btn--primary">
                {webinar.status === 'live' ? 'Voltar ao estúdio' : 'Abrir estúdio'}
              </Link>
            ) : null}
            <Link to={`${PLATFORM_BASE}/webinars/${webinar.id}/editar`} className="imp-btn imp-btn--ghost">
              Editar
            </Link>
            <button type="button" className="imp-btn imp-btn--ghost" disabled={busy || webinar.status === 'live'} onClick={remove}>
              Excluir
            </button>
          </div>
        ) : null}
      </header>

      {notice ? <p className="webinar-note webinar-note--error">{notice}</p> : null}
      {!canEdit ? (
        <p className="webinar-note">Você pode acompanhar este webinar. Só o responsável ou o administrador do cliente altera.</p>
      ) : null}

      <div className="imp-panel">
        <dl className="webinar-m3__detail-grid">
          <div>
            <dt>Descrição</dt>
            <dd>{webinar.description || '—'}</dd>
          </div>
          <div>
            <dt>Vagas</dt>
            <dd>{webinar.maxParticipants ?? 'Sem limite'}</dd>
          </div>
          <div>
            <dt>Fuso horário</dt>
            <dd>{webinar.timezone}</dd>
          </div>
        </dl>
      </div>

      <div className="webinar-m3__filters" role="tablist" aria-label="Seções do webinar">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`webinar-m3__filter${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'codes' ? <AccessCodesPanel webinar={webinar} canEdit={canEdit} /> : null}
      {tab === 'leads' ? <LeadsPanel webinarId={webinar.id} canEdit={canEdit} /> : null}
      {tab === 'chat' ? (
        <StaffChatPanel webinarId={webinar.id} closed={webinar.status === 'completed' || webinar.status === 'cancelled'} />
      ) : null}
    </section>
  )
}
