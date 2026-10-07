import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AgentAvatar from '../components/AgentAvatar.jsx'
import { SCENARIO_TYPES, scenarioTypeLabel } from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

const PAGE_SIZE = 9

export default function TrainingPersonasPage() {
  const navigate = useNavigate()
  const { personas, canManage } = useTrainingAi()
  const [query, setQuery] = useState('')
  const [scenarioFilter, setScenarioFilter] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return personas.filter((persona) => {
      if (scenarioFilter !== 'all' && persona.scenarioType !== scenarioFilter) return false
      if (!term) return true
      const haystack = [persona.name, persona.location, persona.negotiatorType, scenarioTypeLabel(persona.scenarioType)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [personas, query, scenarioFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function setFilter(next) {
    setScenarioFilter(next)
    setPage(1)
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Minhas Personas</h2>
        </div>
        <div className="training-ai__page-header-actions">
          <label className="training-ai__search training-ai__search--action">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Pesquisar..."
            />
            <span className="training-ai__search-btn" aria-hidden="true">⌕</span>
          </label>
          {canManage ? (
            <Link to="/modules/training-ai/personas/nova" className="imp-btn imp-btn--primary">
              + Criar Persona
            </Link>
          ) : null}
        </div>
      </header>

      <div className="training-ai__scenario-tabs" role="tablist" aria-label="Cenários">
        <span className="training-ai__scenario-legend">Cenários</span>
        <button
          type="button"
          className={`training-ai__scenario-tab ${scenarioFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos
        </button>
        {SCENARIO_TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`training-ai__scenario-tab ${scenarioFilter === item.id ? 'is-active' : ''}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="imp-panel">
        {pageRows.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhuma persona</h3>
            <p>Crie a primeira persona para iniciar uma simulação por voz.</p>
            {canManage ? (
              <Link to="/modules/training-ai/personas/nova" className="imp-btn imp-btn--primary">
                + Criar Persona
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="training-ai__persona-grid">
              {pageRows.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  className="training-ai__persona-tile"
                  onClick={() => navigate(`/modules/training-ai/personas/${persona.id}`)}
                >
                  <div className="training-ai__persona-tile-head">
                    <AgentAvatar id={persona.id} name={persona.name} size="md" photo={persona.avatarData} />
                    <div>
                      <strong>{persona.name}</strong>
                      <span>{persona.location || '—'}</span>
                    </div>
                  </div>
                  <div className="training-ai__persona-tile-meta">
                    <div>
                      <span className="training-ai__tile-label">Negociador</span>
                      <strong>{persona.negotiatorType || '—'}</strong>
                    </div>
                    <div>
                      <span className="training-ai__tile-label">Cenário</span>
                      <strong>{scenarioTypeLabel(persona.scenarioType)}</strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="training-ai__pagination">
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage(1)} aria-label="Primeira página">«</button>
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Anterior">‹</button>
              <span className="training-ai__page-num">{currentPage}</span>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Próxima">›</button>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)} aria-label="Última página">»</button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
