import { useEffect, useMemo, useState } from 'react'
import TrainingPage from '../components/TrainingPage.jsx'
import TrainingButton from '../components/TrainingButton.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import AgentAvatar from '../components/AgentAvatar.jsx'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

const PAGE_SIZE = 8
const TABS = [
  { id: 'members', label: 'Membros' },
  { id: 'groups', label: 'Grupos' },
  { id: 'personas', label: 'Personas' },
]

function parseEmails(text) {
  return [
    ...new Set(
      String(text || '')
        .split(/[\s,;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.includes('@')),
    ),
  ]
}

function emptyForm() {
  return {
    name: '',
    description: '',
    monthlyMinutes: '',
    emailDraft: '',
    members: [],
    linkedGroupIds: [],
    personaIds: [],
  }
}

export default function TrainingGroupsPage() {
  const { canManage, personas, updatePersona } = useTrainingAi()
  const [groups, setGroups] = useState([])
  const [people, setPeople] = useState([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [tab, setTab] = useState('members')
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [inviteNotice, setInviteNotice] = useState('')

  async function reload() {
    const [nextGroups, directory] = await Promise.all([trainingApi.listGroups(), trainingApi.listDirectory()])
    setGroups(nextGroups || [])
    setPeople(directory || [])
  }

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    reload().catch((err) => {
      if (!cancelled) setError(err?.message || 'Não foi possível carregar os grupos.')
    })
    return () => {
      cancelled = true
    }
  }, [canManage])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    let rows = groups
    if (term) rows = rows.filter((group) => `${group.name} ${group.description || ''}`.toLowerCase().includes(term))
    const sorted = [...rows]
    if (sort === 'az') sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    if (sort === 'za') sorted.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'))
    if (sort === 'oldest') sorted.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    if (sort === 'recent') sorted.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    return sorted
  }, [groups, query, sort])

  const tabRows = useMemo(() => {
    if (tab === 'members') return form.members
    if (tab === 'groups') return groups
    return personas || []
  }, [form.members, groups, personas, tab])

  const pageCount = Math.max(1, Math.ceil(tabRows.length / PAGE_SIZE) || 1)
  const safePage = Math.min(page, pageCount)
  const pageRows = tabRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function patchForm(patch) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function openCreate() {
    setForm(emptyForm())
    setTab('members')
    setPage(1)
    setInviteNotice('')
    setError('')
    setCreating(true)
  }

  function closeCreate() {
    setCreating(false)
    setForm(emptyForm())
    setTab('members')
    setPage(1)
    setInviteNotice('')
    setError('')
  }

  function addEmails() {
    const emails = parseEmails(form.emailDraft)
    if (!emails.length) {
      setInviteNotice('Informe ao menos um e-mail válido.')
      return
    }

    const nextMembers = [...form.members]
    let matched = 0
    let pending = 0

    emails.forEach((email) => {
      if (nextMembers.some((member) => String(member.email || '').toLowerCase() === email)) return
      const person = people.find((item) => String(item.email || '').toLowerCase() === email)
      if (person) {
        nextMembers.push({
          id: person.id,
          name: person.name || email,
          email: person.email || email,
          pending: false,
        })
        matched += 1
      } else {
        nextMembers.push({
          id: `pending_${email}`,
          name: email,
          email,
          pending: true,
        })
        pending += 1
      }
    })

    patchForm({ members: nextMembers, emailDraft: '' })
    setInviteNotice(
      pending
        ? `${matched} usuário(s) adicionados. ${pending} e-mail(s) não encontrados no diretório.`
        : `${matched} usuário(s) adicionados.`,
    )
    setTab('members')
    setPage(1)
  }

  function removeMember(id) {
    patchForm({ members: form.members.filter((member) => member.id !== id) })
  }

  function toggleLinkedGroup(id) {
    patchForm({
      linkedGroupIds: form.linkedGroupIds.includes(id)
        ? form.linkedGroupIds.filter((item) => item !== id)
        : [...form.linkedGroupIds, id],
    })
  }

  function togglePersona(id) {
    patchForm({
      personaIds: form.personaIds.includes(id)
        ? form.personaIds.filter((item) => item !== id)
        : [...form.personaIds, id],
    })
  }

  async function createGroup() {
    const name = form.name.trim()
    if (!name) {
      setError('Informe o nome do grupo.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const userIds = form.members.filter((member) => !member.pending).map((member) => member.id)
      const created = await trainingApi.createGroup({
        name,
        description: form.description.trim(),
        status: 'active',
        userIds,
      })

      if (created?.id && form.personaIds.length) {
        await Promise.all(
          form.personaIds.map(async (personaId) => {
            const persona = (personas || []).find((item) => item.id === personaId)
            if (!persona) return
            await updatePersona(personaId, {
              ...persona,
              visibility: 'group',
              groupId: created.id,
            })
          }),
        )
      }

      closeCreate()
      await reload()
    } catch (err) {
      setError(err?.message || 'Não foi possível criar o grupo.')
    } finally {
      setSaving(false)
    }
  }

  function goNext() {
    const index = TABS.findIndex((item) => item.id === tab)
    if (index < TABS.length - 1) {
      if (tab === 'members' && !form.name.trim()) {
        setError('Informe o nome do grupo antes de continuar.')
        return
      }
      setError('')
      setTab(TABS[index + 1].id)
      setPage(1)
      return
    }
    createGroup()
  }

  if (!canManage) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Somente o administrador da empresa gerencia grupos.</p>
        </div>
      </TrainingPage>
    )
  }

  if (creating) {
    const tabLabel =
      tab === 'members' ? `Membros (${form.members.length})` : tab === 'groups' ? 'Grupos' : 'Personas'
    const nextLabel = tab === 'personas' ? (saving ? 'Salvando...' : 'Salvar') : 'Próximo'

    return (
      <TrainingPage className="training-ai__group-create">
        <header className="training-ai__page-header">
          <div>
            <h2>+ Criar Grupo</h2>
          </div>
          <div className="training-ai__page-header-actions">
            <TrainingButton variant="primary" onClick={closeCreate}>
              <OutlineIcon name="users" />
              Meus Grupos
            </TrainingButton>
          </div>
        </header>

        {error ? <p className="training-ai__form-error">{error}</p> : null}

        <div className="training-ai__group-create-layout">
          <aside className="imp-panel training-ai__group-create-side">
            <section className="training-ai__group-create-section">
              <h3>Informações básicas</h3>
              <div className="training-ai__create-fields">
                <label className="imp-field">
                  <span>Nome do Grupo*</span>
                  <input
                    value={form.name}
                    onChange={(event) => patchForm({ name: event.target.value })}
                    placeholder="Insira o nome do grupo..."
                    required
                  />
                </label>
                <label className="imp-field">
                  <span>Descrição</span>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(event) => patchForm({ description: event.target.value })}
                    placeholder="Insira uma breve descrição para o grupo..."
                  />
                </label>
                <label className="imp-field">
                  <span>Limite mensal (minutos)</span>
                  <input
                    value={form.monthlyMinutes}
                    onChange={(event) => patchForm({ monthlyMinutes: event.target.value.replace(/[^\d]/g, '') })}
                    placeholder="Deixe vazio para ilimitado..."
                    inputMode="numeric"
                  />
                  <small className="training-ai__field-hint">
                    {form.monthlyMinutes
                      ? `Limite de ${form.monthlyMinutes} minutos por mês.`
                      : 'Sem limite: uso ilimitado de créditos.'}
                  </small>
                </label>
              </div>
            </section>

            <section className="training-ai__group-create-section">
              <h3>Convite via e-mail</h3>
              <div className="training-ai__create-fields">
                <label className="imp-field">
                  <span>Lista de E-mails</span>
                  <textarea
                    rows={5}
                    value={form.emailDraft}
                    onChange={(event) => {
                      patchForm({ emailDraft: event.target.value })
                      setInviteNotice('')
                    }}
                    placeholder="Cole aqui emails separados por vírgula, espaço ou quebra de linha..."
                  />
                </label>
                {inviteNotice ? <p className="training-ai__field-hint">{inviteNotice}</p> : null}
                <div className="training-ai__group-invite-actions">
                  <TrainingButton type="button" variant="primary" onClick={addEmails}>
                    <OutlineIcon name="userPlus" />
                    Adicionar
                  </TrainingButton>
                </div>
              </div>
            </section>
          </aside>

          <section className="imp-panel training-ai__group-create-main">
            <div className="training-ai__group-create-tabs" role="tablist" aria-label="Conteúdo do grupo">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={tab === item.id ? 'is-active' : ''}
                  onClick={() => {
                    setTab(item.id)
                    setPage(1)
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="training-ai__group-create-stage">
              <h4>{tabLabel}</h4>

              {tab === 'members' ? (
                form.members.length === 0 ? (
                  <div className="training-ai__empty training-ai__group-create-empty">
                    <p>Nenhum membro adicionado. Adicione e-mails no formulário ao lado.</p>
                  </div>
                ) : (
                  <ul className="training-ai__group-member-list">
                    {pageRows.map((member) => (
                      <li key={member.id}>
                        <span className="training-ai__history-user">
                          <span className="training-ai__user-avatar">{(member.name || '?').slice(0, 1)}</span>
                          <span>
                            <strong>{member.name}</strong>
                            <small>{member.email}</small>
                          </span>
                        </span>
                        <span className="training-ai__group-member-meta">
                          {member.pending ? <span className="imp-pill imp-pill--muted">Pendente</span> : null}
                          <button
                            type="button"
                            className="imp-btn imp-btn--ghost training-ai__btn--icon"
                            aria-label={`Remover ${member.name}`}
                            onClick={() => removeMember(member.id)}
                          >
                            <OutlineIcon name="x" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}

              {tab === 'groups' ? (
                groups.length === 0 ? (
                  <div className="training-ai__empty training-ai__group-create-empty">
                    <p>Nenhum grupo existente para vincular.</p>
                  </div>
                ) : (
                  <ul className="training-ai__group-pick-list">
                    {pageRows.map((group) => {
                      const selected = form.linkedGroupIds.includes(group.id)
                      return (
                        <li key={group.id}>
                          <button
                            type="button"
                            className={`training-ai__group-pick ${selected ? 'is-selected' : ''}`}
                            onClick={() => toggleLinkedGroup(group.id)}
                            aria-pressed={selected}
                          >
                            <strong>{group.name}</strong>
                            <small>{group.description || 'Sem descrição'}</small>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )
              ) : null}

              {tab === 'personas' ? (
                !(personas || []).length ? (
                  <div className="training-ai__empty training-ai__group-create-empty">
                    <p>Nenhuma persona disponível.</p>
                  </div>
                ) : (
                  <ul className="training-ai__group-pick-list">
                    {pageRows.map((persona) => {
                      const selected = form.personaIds.includes(persona.id)
                      return (
                        <li key={persona.id}>
                          <button
                            type="button"
                            className={`training-ai__group-pick training-ai__group-pick--persona ${selected ? 'is-selected' : ''}`}
                            onClick={() => togglePersona(persona.id)}
                            aria-pressed={selected}
                          >
                            <AgentAvatar
                              id={persona.id}
                              name={persona.name || '—'}
                              size="sm"
                              photo={persona.avatarData}
                            />
                            <span>
                              <strong>{persona.name}</strong>
                              <small>{persona.role || persona.negotiatorType || 'Persona'}</small>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )
              ) : null}
            </div>

            <div className="training-ai__group-create-footer">
              <div className="training-ai__group-pagination" aria-label="Paginação">
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(1)} aria-label="Primeira página">
                  <OutlineIcon name="chevronsLeft" />
                </button>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  aria-label="Página anterior"
                >
                  <OutlineIcon name="chevron" className="is-flip" />
                </button>
                <span className="training-ai__group-page-current">{safePage}</span>
                <button
                  type="button"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  aria-label="Próxima página"
                >
                  <OutlineIcon name="chevron" />
                </button>
                <button
                  type="button"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(pageCount)}
                  aria-label="Última página"
                >
                  <OutlineIcon name="chevronsRight" />
                </button>
              </div>

              <div className="training-ai__group-create-actions">
                <button type="button" className="imp-btn training-ai__btn-cancel" onClick={closeCreate}>
                  <OutlineIcon name="x" />
                  Cancelar
                </button>
                <TrainingButton type="button" variant="primary" onClick={goNext} disabled={saving}>
                  {nextLabel}
                  {tab !== 'personas' ? <OutlineIcon name="chevron" /> : null}
                </TrainingButton>
              </div>
            </div>
          </section>
        </div>
      </TrainingPage>
    )
  }

  return (
    <TrainingPage>
      <header className="training-ai__page-header">
        <div>
          <h2>Grupos</h2>
        </div>
        <div className="training-ai__page-header-actions">
          <label className="training-ai__search training-ai__search--action">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar..." />
            <span className="training-ai__search-btn" aria-hidden="true">
              <OutlineIcon name="search" />
            </span>
          </label>
          <TrainingButton variant="primary" onClick={openCreate}>
            + Criar Grupo
          </TrainingButton>
        </div>
      </header>

      {error ? <p className="training-ai__form-error">{error}</p> : null}

      <div className="training-ai__sort-bar">
        <span>ORDENAR</span>
        {[
          ['recent', 'Mais recente'],
          ['oldest', 'Mais antigo'],
          ['az', 'A-Z'],
          ['za', 'Z-A'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={sort === id ? 'is-active' : ''}
            onClick={() => setSort(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="imp-panel">
        {visible.length === 0 ? (
          <div className="training-ai__empty"><h3>Nenhum grupo</h3></div>
        ) : (
          <div className="training-ai__group-grid">
            {visible.map((group) => (
              <article key={group.id} className="training-ai__group-card">
                <header>
                  <div>
                    <h3>{group.name}</h3>
                    <p>{group.description || 'Sem descrição'}</p>
                  </div>
                  <button
                    type="button"
                    className="imp-btn imp-btn--ghost"
                    onClick={async () => {
                      await trainingApi.deleteGroup(group.id)
                      await reload()
                    }}
                  >
                    Excluir
                  </button>
                </header>
                <div className="training-ai__template-stats">
                  <div>
                    <span className="training-ai__tile-label">Membros</span>
                    <strong>{group.memberCount}</strong>
                  </div>
                  <div>
                    <span className="training-ai__tile-label">Personas</span>
                    <strong>{group.personaCount ?? 0}</strong>
                  </div>
                  <div>
                    <span className="training-ai__tile-label">Status</span>
                    <span className={`imp-pill ${group.status === 'active' ? 'imp-pill--green' : 'imp-pill--muted'}`}>
                      {group.status === 'active' ? '+ Ativo' : 'Pausado'}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </TrainingPage>
  )
}
