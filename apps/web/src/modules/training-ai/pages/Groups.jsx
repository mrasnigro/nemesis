import { useCallback, useEffect, useMemo, useState } from 'react'
import TrainingPage from '../components/TrainingPage.jsx'
import TrainingButton from '../components/TrainingButton.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import AgentAvatar from '../components/AgentAvatar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

const PAGE_SIZE = 8
const DIRECTORY_SUGGESTIONS = 6
const TABS = [
  { id: 'members', label: 'Membros' },
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
    status: 'active',
    emailDraft: '',
    members: [],
    personaIds: [],
  }
}

export default function TrainingGroupsPage() {
  const { canManage, personas, updatePersona } = useTrainingAi()
  const [groups, setGroups] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(null) // null | { id: string | null, initialPersonaIds: string[] }
  const [form, setForm] = useState(emptyForm)
  const [tab, setTab] = useState('members')
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyGroupId, setBusyGroupId] = useState('')
  const [inviteNotice, setInviteNotice] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)

  const reload = useCallback(async () => {
    const [nextGroups, directory] = await Promise.all([trainingApi.listGroups(), trainingApi.listDirectory()])
    setGroups(nextGroups || [])
    setPeople(directory || [])
  }, [])

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    reload()
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Não foi possível carregar os grupos.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canManage, reload])

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
    return personas || []
  }, [form.members, personas, tab])

  const directoryMatches = useMemo(() => {
    const term = memberQuery.trim().toLowerCase()
    if (!term) return []
    const taken = new Set(form.members.map((member) => member.id))
    return people
      .filter((person) => !taken.has(person.id) && person.status !== 'inactive')
      .filter((person) => `${person.name} ${person.email || ''}`.toLowerCase().includes(term))
      .slice(0, DIRECTORY_SUGGESTIONS)
  }, [form.members, memberQuery, people])

  const pageCount = Math.max(1, Math.ceil(tabRows.length / PAGE_SIZE) || 1)
  const safePage = Math.min(page, pageCount)
  const pageRows = tabRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function patchForm(patch) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function resetEditorUi() {
    setTab('members')
    setPage(1)
    setInviteNotice('')
    setMemberQuery('')
    setError('')
  }

  function openCreate() {
    setForm(emptyForm())
    resetEditorUi()
    setEditor({ id: null, initialPersonaIds: [] })
  }

  async function openEdit(group) {
    setBusyGroupId(group.id)
    setError('')
    try {
      const full = await trainingApi.getGroup(group.id)
      const personaIds = (personas || []).filter((persona) => persona.groupId === group.id).map((persona) => persona.id)
      setForm({
        name: full?.name || group.name,
        description: full?.description || '',
        monthlyMinutes: full?.monthlyMinutes == null ? '' : String(full.monthlyMinutes),
        status: full?.status || 'active',
        emailDraft: '',
        members: (full?.members || []).map((member) => ({ ...member, pending: false })),
        personaIds,
      })
      resetEditorUi()
      setEditor({ id: group.id, initialPersonaIds: personaIds })
    } catch (err) {
      setError(err?.message || 'Não foi possível abrir o grupo.')
    } finally {
      setBusyGroupId('')
    }
  }

  function closeEditor() {
    setEditor(null)
    setForm(emptyForm())
    resetEditorUi()
  }

  function addPerson(person) {
    if (form.members.some((member) => member.id === person.id)) return
    patchForm({
      members: [...form.members, { id: person.id, name: person.name, email: person.email || '', pending: false }],
    })
    setMemberQuery('')
    setTab('members')
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
        ? `${matched} usuário(s) adicionados. ${pending} e-mail(s) não têm conta — crie o acesso em Administração → Usuários; eles não serão salvos no grupo.`
        : `${matched} usuário(s) adicionados.`,
    )
    setTab('members')
    setPage(1)
  }

  function removeMember(id) {
    patchForm({ members: form.members.filter((member) => member.id !== id) })
  }

  function togglePersona(id) {
    patchForm({
      personaIds: form.personaIds.includes(id)
        ? form.personaIds.filter((item) => item !== id)
        : [...form.personaIds, id],
    })
  }

  async function syncPersonas(groupId, selectedIds, initialIds) {
    const added = selectedIds.filter((id) => !initialIds.includes(id))
    const removed = initialIds.filter((id) => !selectedIds.includes(id))
    const results = await Promise.all([
      ...added.map((personaId) => {
        const persona = (personas || []).find((item) => item.id === personaId)
        return persona ? updatePersona(personaId, { ...persona, visibility: 'group', groupId }) : { ok: true }
      }),
      ...removed.map((personaId) => {
        const persona = (personas || []).find((item) => item.id === personaId)
        return persona ? updatePersona(personaId, { ...persona, visibility: 'company', groupId: '' }) : { ok: true }
      }),
    ])
    return results.filter((result) => !result?.ok).length
  }

  async function saveGroup() {
    const name = form.name.trim()
    if (!name) {
      setError('Informe o nome do grupo.')
      return
    }
    const monthlyMinutes = form.monthlyMinutes ? Number(form.monthlyMinutes) : null
    if (monthlyMinutes != null && (monthlyMinutes < 1 || monthlyMinutes > 100000)) {
      setError('O limite mensal deve ficar entre 1 e 100.000 minutos.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const body = {
        name,
        description: form.description.trim(),
        status: form.status,
        monthlyMinutes,
        userIds: form.members.filter((member) => !member.pending).map((member) => member.id),
      }
      const saved = editor?.id ? await trainingApi.updateGroup(editor.id, body) : await trainingApi.createGroup(body)
      const groupId = saved?.id || editor?.id
      const failed = groupId ? await syncPersonas(groupId, form.personaIds, editor?.initialPersonaIds || []) : 0

      await reload()
      if (failed) {
        setError(`Grupo salvo, mas ${failed} persona(s) não puderam ser atualizadas. Revise as personas e tente de novo.`)
        setEditor((current) => (current ? { ...current, id: groupId } : current))
        return
      }
      closeEditor()
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar o grupo.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(group) {
    setBusyGroupId(group.id)
    setError('')
    try {
      const full = await trainingApi.getGroup(group.id)
      await trainingApi.updateGroup(group.id, {
        name: full.name,
        description: full.description || '',
        status: full.status === 'active' ? 'paused' : 'active',
        monthlyMinutes: full.monthlyMinutes ?? null,
        userIds: (full.members || []).map((member) => member.id),
      })
      await reload()
    } catch (err) {
      setError(err?.message || 'Não foi possível alterar o status do grupo.')
    } finally {
      setBusyGroupId('')
    }
  }

  async function confirmDelete() {
    const group = pendingDelete
    setPendingDelete(null)
    if (!group) return
    setBusyGroupId(group.id)
    setError('')
    try {
      await trainingApi.deleteGroup(group.id)
      await reload()
    } catch (err) {
      setError(err?.message || 'Não foi possível excluir o grupo.')
    } finally {
      setBusyGroupId('')
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
    saveGroup()
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

  if (editor) {
    const isEdit = Boolean(editor.id)
    const tabLabel = tab === 'members' ? `Membros (${form.members.length})` : `Personas (${form.personaIds.length})`
    const nextLabel = tab === 'personas' ? (saving ? 'Salvando...' : 'Salvar') : 'Próximo'

    return (
      <TrainingPage className="training-ai__group-create">
        <header className="training-ai__page-header">
          <div>
            <h2>{isEdit ? 'Editar Grupo' : '+ Criar Grupo'}</h2>
          </div>
          <div className="training-ai__page-header-actions">
            <TrainingButton variant="primary" onClick={closeEditor}>
              <OutlineIcon name="users" />
              Meus Grupos
            </TrainingButton>
          </div>
        </header>

        {error ? (
          <p className="training-ai__form-error" role="alert">
            {error}
          </p>
        ) : null}

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
                    maxLength={200}
                    required
                  />
                </label>
                <label className="imp-field">
                  <span>Descrição</span>
                  <textarea
                    rows={4}
                    value={form.description}
                    maxLength={500}
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
                <label className="imp-field">
                  <span>Status</span>
                  <select value={form.status} onChange={(event) => patchForm({ status: event.target.value })}>
                    <option value="active">Ativo</option>
                    <option value="paused">Pausado</option>
                  </select>
                  <small className="training-ai__field-hint">
                    Grupo pausado: os membros deixam de ver as personas restritas a ele.
                  </small>
                </label>
              </div>
            </section>

            <section className="training-ai__group-create-section">
              <h3>Adicionar da equipe</h3>
              <div className="training-ai__create-fields">
                <label className="imp-field">
                  <span>Buscar usuário</span>
                  <input
                    value={memberQuery}
                    onChange={(event) => setMemberQuery(event.target.value)}
                    placeholder="Nome ou e-mail..."
                    autoComplete="off"
                  />
                </label>
                {memberQuery.trim() ? (
                  directoryMatches.length ? (
                    <ul className="training-ai__group-directory">
                      {directoryMatches.map((person) => (
                        <li key={person.id}>
                          <button type="button" onClick={() => addPerson(person)}>
                            <span className="training-ai__user-avatar">{(person.name || '?').slice(0, 1)}</span>
                            <span>
                              <strong>{person.name}</strong>
                              <small>{person.email || 'Sem e-mail'}</small>
                            </span>
                            <OutlineIcon name="userPlus" size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="training-ai__field-hint">Nenhum usuário encontrado.</p>
                  )
                ) : null}
              </div>
            </section>

            <section className="training-ai__group-create-section">
              <h3>Adicionar por e-mail</h3>
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
                    <p>Nenhum membro adicionado. Busque na equipe ou cole e-mails no formulário ao lado.</p>
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
                          {member.pending ? (
                            <span className="imp-pill imp-pill--muted" title="Sem conta na plataforma — não será salvo">
                              Sem conta
                            </span>
                          ) : null}
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

              {tab === 'personas' ? (
                !(personas || []).length ? (
                  <div className="training-ai__empty training-ai__group-create-empty">
                    <p>Nenhuma persona disponível.</p>
                  </div>
                ) : (
                  <>
                    <p className="training-ai__field-hint">
                      Personas marcadas ficam visíveis só para este grupo. Ao desmarcar, a persona volta a ser da empresa
                      toda.
                    </p>
                    <ul className="training-ai__group-pick-list">
                      {pageRows.map((persona) => {
                        const selected = form.personaIds.includes(persona.id)
                        const otherGroup =
                          persona.groupId && persona.groupId !== editor.id
                            ? groups.find((group) => group.id === persona.groupId)
                            : null
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
                                <small>
                                  {persona.role || persona.negotiatorType || 'Persona'}
                                  {otherGroup ? ` · hoje em ${otherGroup.name}` : ''}
                                </small>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </>
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
                <button type="button" className="imp-btn training-ai__btn-cancel" onClick={closeEditor}>
                  <OutlineIcon name="x" />
                  Cancelar
                </button>
                {isEdit && tab !== 'personas' ? (
                  <TrainingButton type="button" variant="ghost" onClick={saveGroup} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </TrainingButton>
                ) : null}
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
            <span className="sr-only">Pesquisar grupos</span>
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

      {error ? (
        <p className="training-ai__form-error" role="alert">
          {error}
        </p>
      ) : null}

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
        {loading ? (
          <p className="training-ai__meta">Carregando grupos…</p>
        ) : visible.length === 0 ? (
          <div className="training-ai__empty">
            <h3>{groups.length ? 'Nenhum grupo encontrado' : 'Nenhum grupo'}</h3>
            <p>
              {groups.length
                ? 'Ajuste a pesquisa.'
                : 'Grupos organizam equipes, limitam minutos por mês e restringem personas a quem precisa delas.'}
            </p>
          </div>
        ) : (
          <div className="training-ai__group-grid">
            {visible.map((group) => {
              const busy = busyGroupId === group.id
              return (
                <article key={group.id} className="training-ai__group-card">
                  <header>
                    <div>
                      <h3>{group.name}</h3>
                      <p>{group.description || 'Sem descrição'}</p>
                    </div>
                    <div className="training-ai__group-card-actions">
                      <button type="button" className="imp-btn imp-btn--ghost" disabled={busy} onClick={() => openEdit(group)}>
                        Editar
                      </button>
                      <button type="button" className="imp-btn imp-btn--ghost" disabled={busy} onClick={() => toggleStatus(group)}>
                        {group.status === 'active' ? 'Pausar' : 'Ativar'}
                      </button>
                      <button type="button" className="imp-btn imp-btn--ghost" disabled={busy} onClick={() => setPendingDelete(group)}>
                        Excluir
                      </button>
                    </div>
                  </header>
                  <div className="training-ai__template-stats">
                    <div>
                      <span className="training-ai__tile-label">Membros</span>
                      <strong>{group.memberCount ?? 0}</strong>
                    </div>
                    <div>
                      <span className="training-ai__tile-label">Personas</span>
                      <strong>{group.personaCount ?? 0}</strong>
                    </div>
                    <div>
                      <span className="training-ai__tile-label">Limite/mês</span>
                      <strong>{group.monthlyMinutes == null ? '∞' : `${group.monthlyMinutes} min`}</strong>
                    </div>
                    <div>
                      <span className="training-ai__tile-label">Status</span>
                      <span className={`imp-pill ${group.status === 'active' ? 'imp-pill--green' : 'imp-pill--muted'}`}>
                        {group.status === 'active' ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir grupo?"
        message={
          pendingDelete
            ? `O grupo ${pendingDelete.name} será excluído. As personas restritas a ele passam a ser visíveis para a empresa toda.`
            : ''
        }
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </TrainingPage>
  )
}
