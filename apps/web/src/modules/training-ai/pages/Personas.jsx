import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import TrainingButton from '../components/TrainingButton.jsx'
import AgentAvatar from '../components/AgentAvatar.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import { NEGOTIATOR_TYPES, SCENARIO_TYPES, scenarioTypeLabel } from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

const PAGE_SIZE = 9

export default function TrainingPersonasPage() {
  const navigate = useNavigate()
  const { personas, canManage, reloadCatalog } = useTrainingAi()
  const [query, setQuery] = useState('')
  const [scenarioFilter, setScenarioFilter] = useState('all')
  const [negotiatorFilter, setNegotiatorFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return personas.filter((persona) => {
      if (scenarioFilter !== 'all' && persona.scenarioType !== scenarioFilter) return false
      if (negotiatorFilter !== 'all' && persona.negotiatorType !== negotiatorFilter) return false
      if (!term) return true
      const haystack = [persona.name, persona.location, persona.negotiatorType, scenarioTypeLabel(persona.scenarioType)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [personas, query, scenarioFilter, negotiatorFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function setFilter(next) {
    setScenarioFilter(next)
    setPage(1)
  }

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      await reloadCatalog()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <TrainingPage className="training-ai__personas-page">
      <header className="training-ai__page-header training-ai__personas-header">
        <div className="training-ai__personas-title">
          <OutlineIcon name="user" />
          <h2>Minhas Personas</h2>
        </div>
        <div className="training-ai__page-header-actions training-ai__personas-actions">
          <label className="training-ai__search training-ai__search--action training-ai__search--personas">
            <span className="sr-only">Pesquisar personas</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Pesquisar..."
            />
            <span className="training-ai__search-btn" aria-hidden="true">
              <OutlineIcon name="search" />
            </span>
          </label>

          <div className="training-ai__personas-toolbar">
            <div className="training-ai__personas-icon-wrap">
              <TrainingButton
                variant="ghost"
                iconOnly
                active={filterOpen || negotiatorFilter !== 'all'}
                aria-label="Filtrar personas"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((value) => !value)}
              >
                <OutlineIcon name="sliders" />
              </TrainingButton>
              {filterOpen ? (
                <div className="training-ai__personas-filter-panel" role="dialog" aria-label="Filtros">
                  <p>Negociador</p>
                  <button
                    type="button"
                    className={negotiatorFilter === 'all' ? 'is-active' : ''}
                    onClick={() => {
                      setNegotiatorFilter('all')
                      setPage(1)
                    }}
                  >
                    Todos
                  </button>
                  {NEGOTIATOR_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={negotiatorFilter === type ? 'is-active' : ''}
                      onClick={() => {
                        setNegotiatorFilter(type)
                        setPage(1)
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <TrainingButton
              variant="ghost"
              iconOnly
              aria-label="Atualizar lista"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <OutlineIcon name="refresh" />
            </TrainingButton>

            <TrainingButton
              to="/modules/training-ai/personas/nova"
              variant="primary"
              title={canManage ? undefined : 'Somente o administrador pode criar personas'}
            >
              + Criar Persona
            </TrainingButton>
          </div>
        </div>
      </header>

      <div className="training-ai__scenario-tabs" role="tablist" aria-label="Cenários">
        <button
          type="button"
          className={`training-ai__scenario-legend ${scenarioFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Cenários
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

      <div className="training-ai__personas-stage">
        {pageRows.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhuma persona</h3>
            <p>Crie a primeira persona para iniciar uma simulação por voz.</p>
            <TrainingButton to="/modules/training-ai/personas/nova" variant="primary">
              + Criar Persona
            </TrainingButton>
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
    </TrainingPage>
  )
}
