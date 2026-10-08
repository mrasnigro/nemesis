import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import TrainingButton from '../components/TrainingButton.jsx'
import AgentAvatar from '../components/AgentAvatar.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import { NEGOTIATOR_TYPES, SCENARIO_TYPES, scenarioTypeLabel } from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

const PAGE_SIZE = 9

const BANNER_TONES = [
  ['#1e3a5f', '#3b82f6', '#93c5fd'],
  ['#14532d', '#16a34a', '#86efac'],
  ['#4c1d95', '#7c3aed', '#c4b5fd'],
  ['#7c2d12', '#ea580c', '#fdba74'],
  ['#164e63', '#0891b2', '#67e8f9'],
  ['#831843', '#db2777', '#f9a8d4'],
]

function bannerTone(id = '') {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0
  return BANNER_TONES[Math.abs(h) % BANNER_TONES.length]
}

function PersonaDetailPanel({
  persona,
  canManage,
  canSimulate,
  onClose,
  onDelete,
  onDuplicate,
  onEdit,
  onStart,
  actionError,
  busy,
}) {
  const [audioOnly, setAudioOnly] = useState(true)
  const [from, mid, to] = bannerTone(persona.id)
  const companyLine =
    persona.role && persona.company
      ? `${persona.role} em ${persona.company}`
      : persona.role || persona.company || '—'

  const canVoice =
    canSimulate &&
    persona.status === 'active' &&
    persona.evaluationTemplateId &&
    persona.interactionMode !== 'text'
  const canText =
    canSimulate &&
    persona.status === 'active' &&
    persona.evaluationTemplateId &&
    persona.interactionMode !== 'voice'
  const canStart = canVoice || canText

  function handlePrimaryStart() {
    if (canVoice) onStart('voice')
    else if (canText) onStart('text')
  }

  return (
    <aside className="training-ai__persona-detail" aria-label={`Detalhes de ${persona.name}`}>
      <button
        type="button"
        className="training-ai__persona-detail-close"
        aria-label="Fechar detalhes"
        onClick={onClose}
      >
        <OutlineIcon name="x" size={16} />
      </button>

      <div
        className="training-ai__persona-detail-banner"
        style={{
          background: `linear-gradient(135deg, ${from} 0%, ${mid} 48%, ${to} 100%)`,
        }}
        aria-hidden="true"
      >
        <span className="training-ai__persona-detail-banner-glow" />
      </div>

      <div className="training-ai__persona-detail-identity">
        <AgentAvatar
          id={persona.id}
          name={persona.name}
          size="xl"
          photo={persona.avatarData}
          className="training-ai__persona-detail-avatar"
        />
        <h3>{persona.name}</h3>
        <p>{persona.location || '—'}</p>
      </div>

      <div className="training-ai__persona-detail-instructions">
        <div className="training-ai__persona-detail-instructions-label">
          <OutlineIcon name="star" size={15} className="training-ai__persona-detail-star" />
          <span>Instruções ao Vendedor</span>
        </div>
        <div className="training-ai__persona-detail-instructions-body">
          {persona.sellerInstructions || '—'}
        </div>
      </div>

      <dl className="training-ai__persona-detail-fields">
        <div>
          <dt>DNA comportamental</dt>
          <dd>{persona.negotiatorType || '—'}</dd>
        </div>
        <div>
          <dt>Cargo &amp; Empresa</dt>
          <dd>{companyLine}</dd>
        </div>
        <div>
          <dt>Cenário da Simulação</dt>
          <dd>{scenarioTypeLabel(persona.scenarioType)}</dd>
        </div>
      </dl>

      {persona.status === 'active' && !persona.evaluationTemplateId ? (
        <p className="training-ai__meta training-ai__persona-detail-hint">
          Escolha um template de avaliação nesta persona para iniciar a simulação.
        </p>
      ) : null}

      {actionError ? (
        <p className="training-ai__composer-hint" role="alert">
          {actionError}
        </p>
      ) : null}

      <footer className="training-ai__persona-detail-footer">
        <div className="training-ai__persona-detail-tools">
          {canManage ? (
            <button
              type="button"
              className="training-ai__persona-tool training-ai__persona-tool--danger"
              aria-label="Excluir persona"
              disabled={busy}
              onClick={onDelete}
            >
              <OutlineIcon name="trash" size={18} />
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              className="training-ai__persona-tool training-ai__persona-tool--copy"
              aria-label="Duplicar persona"
              disabled={busy}
              onClick={onDuplicate}
            >
              <OutlineIcon name="copy" size={18} />
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              className="training-ai__persona-tool training-ai__persona-tool--edit"
              aria-label="Editar persona"
              disabled={busy}
              onClick={onEdit}
            >
              <OutlineIcon name="pencil" size={18} />
            </button>
          ) : null}
        </div>

        <div className="training-ai__persona-start-wrap">
          {canVoice ? (
            <div className="training-ai__persona-ligacao">
              <button
                type="button"
                className="training-ai__persona-ligacao-main"
                onClick={() => onStart('voice')}
                disabled={busy}
              >
                <span className="training-ai__persona-ligacao-icon" aria-hidden="true">
                  <OutlineIcon name="phone" size={18} />
                </span>
                <strong>Ligação</strong>
              </button>
              <button
                type="button"
                className={`training-ai__persona-ligacao-toggle${audioOnly ? ' is-on' : ''}`}
                aria-pressed={audioOnly}
                onClick={() => setAudioOnly((value) => !value)}
              >
                Somente áudio
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="training-ai__persona-start"
            disabled={!canStart || busy}
            onClick={handlePrimaryStart}
          >
            <span>Iniciar simulação</span>
            {canVoice ? <OutlineIcon name="chevronDown" size={18} /> : null}
          </button>
        </div>
      </footer>
    </aside>
  )
}

export default function TrainingPersonasPage() {
  const navigate = useNavigate()
  const {
    personas,
    canManage,
    canSimulate,
    createPersona,
    deletePersona,
  } = useTrainingAi()
  const [query, setQuery] = useState('')
  const [scenarioFilter, setScenarioFilter] = useState('all')
  const [negotiatorFilter, setNegotiatorFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

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
  const selected = selectedId ? personas.find((item) => item.id === selectedId) : null

  useEffect(() => {
    if (selectedId && !personas.some((item) => item.id === selectedId)) {
      setSelectedId(null)
    }
  }, [personas, selectedId])

  function setFilter(next) {
    setScenarioFilter(next)
    setPage(1)
  }

  function closeDetail() {
    setSelectedId(null)
    setActionError('')
  }

  function handleSelect(personaId) {
    setActionError('')
    setSelectedId((current) => (current === personaId ? current : personaId))
  }

  function handleStart(mediaMode) {
    if (!selected) return
    navigate(`/modules/training-ai/simulacao/persona/${selected.id}`, {
      state: { mediaMode },
    })
  }

  async function handleDelete() {
    if (!selected) return
    if (!window.confirm(`Excluir o agente ${selected.name}? Essa ação não pode ser desfeita.`)) return
    setBusy(true)
    setActionError('')
    const result = await deletePersona(selected.id)
    setBusy(false)
    if (result.ok) closeDetail()
    else setActionError(result.error || 'Não foi possível excluir.')
  }

  async function handleDuplicate() {
    if (!selected) return
    setBusy(true)
    setActionError('')
    const result = await createPersona({
      ...selected,
      name: `${selected.name} (cópia)`,
      status: selected.status === 'active' ? 'draft' : selected.status,
    })
    setBusy(false)
    if (result.ok && result.persona) {
      setSelectedId(result.persona.id)
      setPage(1)
    } else {
      setActionError(result.error || result.errors?.[0] || 'Não foi possível duplicar.')
    }
  }

  return (
    <TrainingPage className="training-ai__personas-page">
      <header className="training-ai__page-header training-ai__personas-header">
        <div className="training-ai__personas-title">
          <OutlineIcon name="user" />
          <h2>Configurador de Agentes</h2>
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
                  <p>DNA comportamental</p>
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
              to="/modules/training-ai/historico"
              variant="ghost"
              iconOnly
              aria-label="Minhas Simulações"
              title="Minhas Simulações"
            >
              <OutlineIcon name="history" />
            </TrainingButton>

            {canManage ? (
              <TrainingButton to="/modules/training-ai/personas/nova" variant="primary">
                + Criar Agente
              </TrainingButton>
            ) : null}
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

      <div
        className={`training-ai__personas-stage${selected ? ' training-ai__personas-stage--split' : ''}`}
      >
        {pageRows.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhum agente</h3>
            <p>Crie o primeiro agente com DNA comportamental para iniciar uma simulação.</p>
            {canManage ? (
              <TrainingButton to="/modules/training-ai/personas/nova" variant="primary">
                + Criar Agente
              </TrainingButton>
            ) : null}
          </div>
        ) : (
          <>
            <div className="training-ai__personas-master">
              <div className={`training-ai__persona-grid${selected ? ' is-list' : ''}`}>
                {pageRows.map((persona) => {
                  const isSelected = selected?.id === persona.id
                  return (
                    <div
                      key={persona.id}
                      className={`training-ai__persona-tile${isSelected ? ' is-selected' : ''}`}
                    >
                      {isSelected ? (
                        <button
                          type="button"
                          className="training-ai__persona-tile-close"
                          aria-label="Fechar detalhes"
                          onClick={(event) => {
                            event.stopPropagation()
                            closeDetail()
                          }}
                        >
                          <OutlineIcon name="x" size={14} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="training-ai__persona-tile-hit"
                        aria-pressed={isSelected}
                        onClick={() => handleSelect(persona.id)}
                      >
                        <div className="training-ai__persona-tile-head">
                          <AgentAvatar
                            id={persona.id}
                            name={persona.name}
                            size="tile"
                            photo={persona.avatarData}
                          />
                          <div>
                            <strong>{persona.name}</strong>
                            <span>{persona.location || '—'}</span>
                          </div>
                        </div>
                        <div className="training-ai__persona-tile-meta">
                          <div>
                            <span className="training-ai__tile-label">DNA</span>
                            <strong>{persona.negotiatorType || '—'}</strong>
                          </div>
                          <div>
                            <span className="training-ai__tile-label">Cenário</span>
                            <strong>{scenarioTypeLabel(persona.scenarioType)}</strong>
                          </div>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="training-ai__pagination">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(1)}
                  aria-label="Primeira página"
                >
                  «
                </button>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Anterior"
                >
                  ‹
                </button>
                <span className="training-ai__page-num">{currentPage}</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Próxima"
                >
                  ›
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  aria-label="Última página"
                >
                  »
                </button>
              </div>
            </div>

            {selected ? (
              <PersonaDetailPanel
                persona={selected}
                canManage={canManage}
                canSimulate={canSimulate}
                onClose={closeDetail}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onEdit={() => navigate(`/modules/training-ai/personas/${selected.id}/editar`)}
                onStart={handleStart}
                actionError={actionError}
                busy={busy}
              />
            ) : null}
          </>
        )}
      </div>
    </TrainingPage>
  )
}
