import { Link, useNavigate, useParams } from 'react-router-dom'
import AgentAvatar from '../components/AgentAvatar.jsx'
import DeleteAction from '../components/DeleteAction.jsx'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { scenarioTypeLabel } from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { derivePersonaTraits, personaStatus } from '../utils/agentDisplay.js'

export default function TrainingPersonaDetailPage() {
  const { personaId } = useParams()
  const navigate = useNavigate()
  const {
    getPersona,
    getScenariosForPersona,
    scenarios,
    canManage,
    canSimulate,
    deletePersona,
  } = useTrainingAi()

  const persona = getPersona(personaId)
  const linkedScenarios = getScenariosForPersona(personaId)
  const practiceScenarios =
    linkedScenarios.length > 0
      ? linkedScenarios
      : scenarios.filter((s) => (s.status || 'active') !== 'archived')

  if (!persona) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Agente não encontrado</h3>
          <div className="imp-actions">
            <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--primary">
              Voltar aos agentes
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const status = personaStatus(persona)
  const traits = derivePersonaTraits(persona)

  function handleStart(mediaMode) {
    navigate(`/modules/training-ai/simulacao/persona/${persona.id}`, {
      state: { mediaMode },
    })
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div className="training-ai__chip-row">
          <AgentAvatar id={persona.id} name={persona.name} size="lg" photo={persona.avatarData} />
          <div>
            <h2>{persona.name}</h2>
            <p>
              {persona.role} · {persona.industry}
              {persona.location ? ` · ${persona.location}` : ''}
            </p>
            <div className="training-ai__chip-row" style={{ marginTop: '0.55rem' }}>
              <span className={`training-ai__status-dot training-ai__status-dot--${status.tone}`}>
                {status.label}
              </span>
              <span className="imp-pill imp-pill--amber">
                {DIFFICULTY_LABELS[persona.difficulty] || persona.difficulty}
              </span>
              {traits.map((trait, index) => (
                <span
                  key={trait}
                  className={`training-ai__trait training-ai__trait--${index % 3}`}
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="training-ai__page-header-actions">
          <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--ghost">
            ← Agentes
          </Link>
          {canManage ? (
            <Link
              to={`/modules/training-ai/personas/${persona.id}/editar`}
              className="imp-btn imp-btn--ghost"
            >
              Editar
            </Link>
          ) : null}
          {canManage ? (
            <DeleteAction
              confirmText={`Excluir o agente ${persona.name}? Essa ação não pode ser desfeita.`}
              onDelete={() => deletePersona(persona.id)}
              onDeleted={() => navigate('/modules/training-ai/personas')}
            />
          ) : null}
          {canSimulate && persona.status === 'active' && persona.evaluationTemplateId && persona.interactionMode !== 'text' ? (
            <button type="button" className="imp-btn imp-btn--primary" onClick={() => handleStart('voice')}>
              Simulação por voz
            </button>
          ) : null}
          {canSimulate && persona.status === 'active' && persona.evaluationTemplateId && persona.interactionMode !== 'voice' ? (
            <button type="button" className="imp-btn imp-btn--ghost" onClick={() => handleStart('text')}>
              Simulação por texto
            </button>
          ) : null}
          {persona.status === 'active' && !persona.evaluationTemplateId ? (
            <p className="training-ai__meta">Escolha um template de avaliação nesta persona para iniciar a simulação.</p>
          ) : null}
        </div>
      </header>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>DNA comportamental</h2>
            <p>Perfil usado nas simulações (DOCX + vídeos)</p>
          </div>
        </div>
        <dl className="training-ai__persona-detail-grid">
          <div>
            <dt>Empresa</dt>
            <dd>{persona.company || '—'}</dd>
          </div>
          <div>
            <dt>Negociador / tom</dt>
            <dd>
              {persona.negotiatorType}
              {persona.tone ? ` · ${persona.tone}` : ''}
            </dd>
          </div>
          <div>
            <dt>Cenário</dt>
            <dd>{scenarioTypeLabel(persona.scenarioType)}</dd>
          </div>
          <div className="training-ai__form-span-2">
            <dt>Instruções ao vendedor</dt>
            <dd>{persona.sellerInstructions || '—'}</dd>
          </div>
          <div>
            <dt>Modelo</dt>
            <dd>{(persona.salesModel || 'b2b').toUpperCase()}</dd>
          </div>
          <div>
            <dt>Modo</dt>
            <dd>{persona.interactionMode === 'text' ? 'Texto' : persona.interactionMode}</dd>
          </div>
          <div className="training-ai__form-span-2">
            <dt>Comportamento</dt>
            <dd>{persona.behavior}</dd>
          </div>
          <div className="training-ai__form-span-2">
            <dt>Objetivo de treinamento</dt>
            <dd>{persona.trainingObjective}</dd>
          </div>
          <div className="training-ai__form-span-2">
            <dt>Frase de abertura</dt>
            <dd>{persona.openingLine}</dd>
          </div>
          {persona.problemAwareness ? (
            <div>
              <dt>Consciência do problema</dt>
              <dd>{persona.problemAwareness}</dd>
            </div>
          ) : null}
          {persona.solutionAwareness ? (
            <div>
              <dt>Consciência da solução</dt>
              <dd>{persona.solutionAwareness}</dd>
            </div>
          ) : null}
          <div>
            <dt>Objeções</dt>
            <dd>
              <ul className="training-ai__list training-ai__list--muted">
                {persona.objections.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>Prioridades / crenças</dt>
            <dd>
              <ul className="training-ai__list training-ai__list--muted">
                {[...(persona.priorities || []), ...(persona.beliefs || [])].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Treinar (entrada pelo agente)</h2>
            <p>
              {linkedScenarios.length
                ? 'Cenários vinculados a este agente.'
                : 'Nenhum cenário vinculado — você pode praticar com qualquer cenário do catálogo.'}
            </p>
          </div>
        </div>
        <div className="imp-list">
          {practiceScenarios.map((scenario) => (
            <div key={scenario.id} className="imp-list-item">
              <div>
                <h3>
                  <Link to={`/modules/training-ai/cenarios/${scenario.id}`}>{scenario.title}</Link>
                </h3>
                <p>
                  {scenario.funnelStage} · {scenario.durationMin} min
                  {!linkedScenarios.some((s) => s.id === scenario.id) ? ' · catálogo' : ''}
                </p>
              </div>
              <button
                type="button"
                className="imp-btn imp-btn--primary"
                disabled={!canSimulate}
                onClick={() => handleStart(scenario.id)}
              >
                Treinar
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
