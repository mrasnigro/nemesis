import { useEffect, useState } from 'react'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingGroupsPage() {
  const { canManage } = useTrainingAi()
  const [groups, setGroups] = useState([])
  const [people, setPeople] = useState([])
  const [name, setName] = useState('')
  const [userIds, setUserIds] = useState([])
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
      await trainingApi.createGroup({ name, userIds })
      setName('')
      setUserIds([])
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
          <p>Um grupo define quem vê uma persona e filtra o histórico dos vendedores.</p>
        </div>
      </header>
      {error ? <p>{error}</p> : null}
      <form className="imp-panel" onSubmit={createGroup}>
        <label className="imp-field">
          <span>Nome do grupo</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <div className="training-ai__chip-row">
          {people.map((person) => (
            <label key={person.id} className="training-ai__trait">
              <input type="checkbox" checked={userIds.includes(person.id)} onChange={() => toggleUser(person.id)} />{' '}
              {person.name}
            </label>
          ))}
        </div>
        <button type="submit" className="imp-btn imp-btn--primary">Criar grupo</button>
      </form>
      <div className="imp-panel">
        {groups.length === 0 ? (
          <div className="training-ai__empty"><h3>Nenhum grupo</h3></div>
        ) : (
          <ul className="training-ai__list">
            {groups.map((group) => (
              <li key={group.id}>
                <strong>{group.name}</strong> — {group.memberCount} pessoa{group.memberCount === 1 ? '' : 's'}
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
