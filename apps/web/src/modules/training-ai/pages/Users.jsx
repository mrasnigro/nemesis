import { useCallback, useEffect, useMemo, useState } from 'react'
import TrainingPage from '../components/TrainingPage.jsx'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { useAuth } from '../../../auth/AuthContext'

const ROLE_LABEL = {
  customer_admin: 'Administrador do Sistema',
  sdr_bdr: 'Usuário Comum',
}

const STATUS_LABEL = {
  active: 'Ativo',
  inactive: 'Inativo',
  invited: 'Convidado',
}

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function temporaryPassword(length = 12) {
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join('')
}

function usernameFromEmail(email) {
  return String(email || '')
    .split('@')[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 80)
}

function emptyInvite() {
  return { name: '', email: '', username: '', password: temporaryPassword(), profile: 'sdr_bdr' }
}

function InvitePanel({ customerId, onCreated, onCancel }) {
  const [form, setForm] = useState(emptyInvite)
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  function patch(next) {
    setForm((current) => ({ ...current, ...next }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const username = form.username.trim().toLowerCase()
    if (form.name.trim().length < 2) return setError('Informe o nome completo.')
    if (!/^[a-z0-9._-]{3,80}$/.test(username)) {
      return setError('O usuário precisa ter ao menos 3 caracteres: letras, números, ponto, hífen ou sublinhado.')
    }
    if (form.password.length < 8) return setError('A senha temporária precisa ter ao menos 8 caracteres.')

    setSaving(true)
    try {
      const user = await trainingApi.inviteUser({
        ...(customerId ? { customerId } : {}),
        name: form.name.trim(),
        email: form.email.trim() || null,
        username,
        password: form.password,
        profile: form.profile,
      })
      setCreated({ user, username, password: form.password })
      onCreated(user)
    } catch (err) {
      const details = Array.isArray(err?.details) ? err.details.map((item) => item.message).filter(Boolean) : []
      setError([err?.message || 'Não foi possível criar o usuário.', ...details].join(' · '))
    } finally {
      setSaving(false)
    }
  }

  async function copyCredentials() {
    if (!created) return
    const text = `Acesso ao Treinamento IA\nUsuário: ${created.username}\nSenha temporária: ${created.password}\nEndereço: ${window.location.origin}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (created) {
    return (
      <div className="imp-panel training-ai__invite-panel">
        <h3>Usuário criado</h3>
        <p className="training-ai__meta">
          Envie os dados abaixo para {created.user?.name || 'o usuário'}. No primeiro acesso o status muda de
          “Convidado” para “Ativo”.
        </p>
        <dl className="training-ai__invite-credentials">
          <div>
            <dt>Usuário</dt>
            <dd>{created.username}</dd>
          </div>
          <div>
            <dt>Senha temporária</dt>
            <dd>{created.password}</dd>
          </div>
        </dl>
        <div className="imp-actions">
          <button type="button" className="imp-btn imp-btn--primary" onClick={copyCredentials}>
            {copied ? 'Copiado' : 'Copiar acesso'}
          </button>
          <button
            type="button"
            className="imp-btn imp-btn--ghost"
            onClick={() => {
              setCreated(null)
              setCopied(false)
              setUsernameTouched(false)
              setForm(emptyInvite())
            }}
          >
            Convidar outro
          </button>
          <button type="button" className="imp-btn imp-btn--ghost" onClick={onCancel}>
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <form className="imp-panel training-ai__invite-panel" onSubmit={handleSubmit}>
      <h3>Convidar usuário</h3>
      <p className="training-ai__meta">
        A conta é criada com acesso a este módulo e uma senha temporária para você compartilhar.
      </p>
      <div className="training-ai__invite-grid">
        <label className="imp-field">
          <span>Nome completo*</span>
          <input value={form.name} onChange={(event) => patch({ name: event.target.value })} required />
        </label>
        <label className="imp-field">
          <span>E-mail</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => {
              const email = event.target.value
              patch(usernameTouched ? { email } : { email, username: usernameFromEmail(email) })
            }}
          />
        </label>
        <label className="imp-field">
          <span>Usuário de acesso*</span>
          <input
            value={form.username}
            onChange={(event) => {
              setUsernameTouched(true)
              patch({ username: event.target.value })
            }}
            autoComplete="off"
            required
          />
        </label>
        <label className="imp-field">
          <span>Senha temporária*</span>
          <span className="training-ai__invite-password">
            <input
              value={form.password}
              onChange={(event) => patch({ password: event.target.value })}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button type="button" className="imp-btn imp-btn--ghost" onClick={() => patch({ password: temporaryPassword() })}>
              Gerar
            </button>
          </span>
        </label>
        <label className="imp-field">
          <span>Papel no Sistema</span>
          <select value={form.profile} onChange={(event) => patch({ profile: event.target.value })}>
            <option value="sdr_bdr">Usuário Comum</option>
            <option value="customer_admin">Administrador do Sistema</option>
          </select>
        </label>
      </div>
      {error ? (
        <p className="training-ai__form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="imp-actions">
        <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
          {saving ? 'Criando…' : 'Criar acesso'}
        </button>
        <button type="button" className="imp-btn imp-btn--ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function TrainingUsersPage() {
  const { canManage } = useTrainingAi()
  const { user } = useAuth()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  const [emailQuery, setEmailQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [applied, setApplied] = useState({ name: '', email: '', status: 'all' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const reload = useCallback(async () => {
    const directory = await trainingApi.listDirectory()
    setPeople(directory || [])
    setSelectedId((current) => current || directory?.[0]?.id || '')
  }, [])

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    reload()
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Não foi possível carregar os usuários.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canManage, reload])

  const filtered = useMemo(() => {
    return people.filter((person) => {
      if (applied.status !== 'all' && person.status !== applied.status) return false
      if (applied.name && !String(person.name || '').toLowerCase().includes(applied.name.trim().toLowerCase())) return false
      if (applied.email && !String(person.email || '').toLowerCase().includes(applied.email.trim().toLowerCase())) return false
      return true
    })
  }, [applied, people])

  const selected = filtered.find((person) => person.id === selectedId) || people.find((person) => person.id === selectedId) || null
  const isSelf = selected?.id === user?.id

  if (!canManage) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Somente o administrador da empresa gerencia usuários.</p>
        </div>
      </TrainingPage>
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

  function applyFilters(event) {
    event?.preventDefault()
    setApplied({ name: nameQuery, email: emailQuery, status: statusFilter })
  }

  return (
    <TrainingPage>
      <header className="training-ai__page-header">
        <div>
          <h2>Usuários</h2>
        </div>
      </header>

      <form className="imp-panel training-ai__filters training-ai__filters--users" onSubmit={applyFilters}>
        <button type="button" className="imp-btn imp-btn--primary" onClick={() => setInviteOpen((v) => !v)} aria-expanded={inviteOpen}>
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
        <button type="submit" className="imp-btn imp-btn--primary">
          Buscar
        </button>
      </form>

      {inviteOpen ? (
        <InvitePanel
          customerId={user?.customer?.id || null}
          onCancel={() => setInviteOpen(false)}
          onCreated={(created) => {
            reload()
              .then(() => {
                if (created?.id) setSelectedId(created.id)
              })
              .catch(() => null)
          }}
        />
      ) : null}

      {error ? (
        <p className="training-ai__form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="training-ai__users-layout">
        <div className="imp-panel">
          <h3>Equipe ({filtered.length})</h3>
          {loading ? <p className="training-ai__meta">Carregando…</p> : null}
          {!loading && filtered.length === 0 ? (
            <p className="training-ai__meta">Nenhum usuário encontrado com esses filtros.</p>
          ) : null}
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
                    <small>
                      {ROLE_LABEL[person.profile] || person.profile}
                      {person.status !== 'active' ? ` · ${STATUS_LABEL[person.status] || person.status}` : ''}
                    </small>
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
                    {STATUS_LABEL[selected.status] || selected.status}
                  </span>
                </div>
              </div>
              <label className="imp-field">
                <span>Papel no Sistema</span>
                <select
                  value={selected.profile}
                  disabled={saving || isSelf}
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
                  disabled={saving || isSelf}
                  onChange={(event) => saveSelected({ status: event.target.value })}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="invited">Convidado</option>
                </select>
              </label>
              {isSelf ? (
                <p className="training-ai__meta">Você não pode alterar o próprio papel ou status.</p>
              ) : null}
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
    </TrainingPage>
  )
}
