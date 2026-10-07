import { useEffect, useMemo, useState } from 'react'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingGroupsPage() {
  const { canManage } = useTrainingAi()
  const [groups, setGroups] = useState([])
  const [people, setPeople] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [userIds, setUserIds] = useState([])
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [error, setError] = useState('')

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

  if (!canManage) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Somente o administrador da empresa gerencia grupos.</p>
        </div>
      </section>
    )
  }

  async function createGroup(event) {
    event.preventDefault()
    setError('')
    try {
      await trainingApi.createGroup({ name, description, status: 'active', userIds })
      setName('')
      setDescription('')
      setUserIds([])
      setCreating(false)
      await reload()
    } catch (err) {
      setError(err?.message || 'Não foi possível criar o grupo.')
    }
  }

  function toggleUser(id) {
    setUserIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Grupos</h2>
        </div>
        <div className="training-ai__page-header-actions">
          <label className="training-ai__search training-ai__search--action">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar..." />
            <span className="training-ai__search-btn" aria-hidden="true">⌕</span>
          </label>
          <button type="button" className="imp-btn imp-btn--primary" onClick={() => setCreating(true)}>
            + Criar Grupo
          </button>
        </div>
      </header>

      {error ? <p>{error}</p> : null}

      {creating ? (
        <form className="imp-panel" onSubmit={createGroup}>
          <label className="imp-field">
            <span>Nome do grupo</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="imp-field">
            <span>Descrição</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className="training-ai__chip-row">
            {people.map((person) => (
              <label key={person.id} className="training-ai__trait">
                <input type="checkbox" checked={userIds.includes(person.id)} onChange={() => toggleUser(person.id)} />{' '}
                {person.name}
              </label>
            ))}
          </div>
          <div className="imp-actions">
            <button type="button" className="imp-btn imp-btn--ghost" onClick={() => setCreating(false)}>Cancelar</button>
            <button type="submit" className="imp-btn imp-btn--primary">Salvar grupo</button>
          </div>
        </form>
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
    </section>
  )
}
