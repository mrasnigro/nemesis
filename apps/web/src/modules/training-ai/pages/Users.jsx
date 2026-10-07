import { useEffect, useMemo, useState } from 'react'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

const ROLE_LABEL = {
  customer_admin: 'Administrador do Sistema',
  sdr_bdr: 'Usuário Comum',
}

export default function TrainingUsersPage() {
  const { canManage } = useTrainingAi()
  const [people, setPeople] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  const [emailQuery, setEmailQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [applied, setApplied] = useState({ name: '', email: '', status: 'all' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  async function reload() {
    const directory = await trainingApi.listDirectory()
    setPeople(directory || [])
    if (!selectedId && directory?.[0]) setSelectedId(directory[0].id)
  }

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    reload().catch((err) => {
      if (!cancelled) setError(err?.message || 'Não foi possível carregar os usuários.')
    })
    return () => {
      cancelled = true
    }
  }, [canManage])

  const filtered = useMemo(() => {
    return people.filter((person) => {
      if (applied.status !== 'all' && person.status !== applied.status) return false
      if (applied.name && !String(person.name || '').toLowerCase().includes(applied.name.trim().toLowerCase())) return false
      if (applied.email && !String(person.email || '').toLowerCase().includes(applied.email.trim().toLowerCase())) return false
      return true
    })
  }, [applied, people])

  const selected = filtered.find((person) => person.id === selectedId) || people.find((person) => person.id === selectedId) || null

  if (!canManage) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Somente o administrador da empresa gerencia usuários.</p>
        </div>
      </section>
    )
  }

  async function saveSelected(patch) {
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      const updated = await trainingApi.patchDirectoryUser(selected.id, patch)
      setPeople((current) => current.map((person) => (person.id === updated.id ? updated : person)))
    } catch (err) {
      setError(err?.message || 'Não foi possível atualizar o usuário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Usuários</h2>
        </div>
      </header>

      <div className="imp-panel training-ai__filters training-ai__filters--users">
        <button type="button" className="imp-btn imp-btn--primary" onClick={() => setInviteOpen((v) => !v)}>
          + Convidar Usuários
        </button>
        <label className="imp-field">
          <span className="sr-only">Buscar por nome</span>
          <input value={nameQuery} onChange={(event) => setNameQuery(event.target.value)} placeholder="Buscar por nome..." />
        </label>
        <label className="imp-field">
          <span className="sr-only">Buscar por e-mail</span>
          <input value={emailQuery} onChange={(event) => setEmailQuery(event.target.value)} placeholder="Buscar por email..." />
        </label>
        <label className="imp-field">
          <span className="sr-only">Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Todos</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="invited">Convidado</option>
          </select>
        </label>
        <button
          type="button"
          className="imp-btn imp-btn--primary"
          onClick={() => setApplied({ name: nameQuery, email: emailQuery, status: statusFilter })}
        >
          Buscar
        </button>
      </div>

      {inviteOpen ? (
        <div className="imp-panel">
          <p className="training-ai__meta">
            Convites por e-mail ainda usam o cadastro da empresa no painel IMP.
            Enquanto isso, utilize usuários já ativos nesta conta.
          </p>
        </div>
      ) : null}

      {error ? <p>{error}</p> : null}

      <div className="training-ai__users-layout">
        <div className="imp-panel">
          <h3>Equipe ({filtered.length})</h3>
          <ul className="training-ai__user-list">
            {filtered.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  className={`training-ai__user-row ${selected?.id === person.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedId(person.id)}
                >
                  <span className="training-ai__user-avatar">{(person.name || '?').slice(0, 1)}</span>
                  <span>
                    <strong>{person.name}</strong>
                    <small>{ROLE_LABEL[person.profile] || person.profile}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="imp-panel">
          {!selected ? (
            <div className="training-ai__empty"><h3>Selecione um usuário</h3></div>
          ) : (
            <>
              <div className="training-ai__user-detail-head">
                <span className="training-ai__user-avatar training-ai__user-avatar--lg">
                  {(selected.name || '?').slice(0, 1)}
                </span>
                <div>
                  <h3>{selected.name}</h3>
                  <p>{selected.email || 'Sem e-mail'}</p>
                  <span className={`imp-pill ${selected.status === 'active' ? 'imp-pill--green' : 'imp-pill--muted'}`}>
                    {selected.status === 'active' ? 'Ativo' : selected.status}
                  </span>
                </div>
              </div>
              <label className="imp-field">
                <span>Papel no Sistema</span>
                <select
                  value={selected.profile}
                  disabled={saving}
                  onChange={(event) => saveSelected({ profile: event.target.value })}
                >
                  <option value="sdr_bdr">Usuário Comum</option>
                  <option value="customer_admin">Administrador do Sistema</option>
                </select>
              </label>
              <label className="imp-field">
                <span>Status</span>
                <select
                  value={selected.status}
                  disabled={saving}
                  onChange={(event) => saveSelected({ status: event.target.value })}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="invited">Convidado</option>
                </select>
              </label>
              <div className="training-ai__user-meta-row">
                <div>
                  <span className="training-ai__tile-label">Criado em</span>
                  <strong>{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('pt-BR') : '—'}</strong>
                </div>
                <div>
                  <span className="training-ai__tile-label">Última atualização</span>
                  <strong>{selected.updatedAt ? new Date(selected.updatedAt).toLocaleDateString('pt-BR') : '—'}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
