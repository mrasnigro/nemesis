import { Link, useNavigate } from 'react-router-dom'
import AgentAvatar from '../components/AgentAvatar.jsx'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { derivePersonaTraits, personaStatus } from '../utils/agentDisplay.js'

export default function TrainingPersonasPage() {
  const navigate = useNavigate()
  const { personas, canManage, getScenariosForPersona, history } = useTrainingAi()

  const activeCount = personas.filter((p) => (p.status || 'active') === 'active').length
  const simCount = history.length

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Configurador de Agentes</h2>
          <p>Crie, configure e gerencie as personas de IA que simulam comportamentos humanos.</p>
        </div>
        <div className="training-ai__page-header-actions">
          {canManage ? (
            <Link to="/modules/training-ai/personas/nova" className="imp-btn imp-btn--primary">
              + Novo Agente
            </Link>
          ) : null}
        </div>
      </header>

      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Agentes criados</p>
          <strong className="accent">{personas.length}</strong>
          <span>No catálogo</span>
        </article>
        <article className="imp-metric">
          <p>Agentes ativos</p>
          <strong className="success">{activeCount}</strong>
          <span>Prontos para simular</span>
        </article>
        <article className="imp-metric">
          <p>Simulações realizadas</p>
          <strong>{simCount}</strong>
          <span>Nesta sessão</span>
        </article>
        <article className="imp-metric">
          <p>Taxa de uso</p>
          <strong>
            {personas.length
              ? `${Math.round((activeCount / personas.length) * 100)}%`
              : '—'}
          </strong>
          <span>Agentes ativos</span>
        </article>
      </div>

      <div className="imp-panel">
        {personas.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhum agente cadastrado</h3>
            <p>Crie o primeiro agente para usar em simulações de treinamento.</p>
            <div className="imp-actions">
              {canManage ? (
                <Link to="/modules/training-ai/personas/nova" className="imp-btn imp-btn--primary">
                  + Novo Agente
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="training-ai__agent-grid">
            {personas.map((persona) => {
              const status = personaStatus(persona)
              const traits = derivePersonaTraits(persona)
              const linked = getScenariosForPersona(persona.id)
              const runs = history.filter((item) => item.personaName === persona.name).length
              return (
                <article key={persona.id} className="training-ai__agent-card">
                  <div className="training-ai__agent-card-top">
                    <span className={`training-ai__status-dot training-ai__status-dot--${status.tone}`}>
                      {status.label}
                    </span>
                    {canManage ? (
                      <button
                        type="button"
                        className="imp-btn imp-btn--ghost"
                        style={{ padding: '0.2rem 0.45rem', minHeight: 0 }}
                        onClick={() =>
                          navigate(`/modules/training-ai/personas/${persona.id}/editar`)
                        }
                      >
                        Editar
                      </button>
                    ) : null}
                  </div>
                  <div className="training-ai__agent-card-body">
                    <AgentAvatar id={persona.id} name={persona.name} size="md" photo={persona.avatarData} />
                    <div>
                      <h3>{persona.name}</h3>
                      <p>{persona.role}</p>
                    </div>
                    <div className="training-ai__trait-row">
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
                  <div className="training-ai__agent-card-foot">
                    <span className="training-ai__meta">
                      {runs} simulação{runs === 1 ? '' : 'ões'} · {linked.length} cenário
                      {linked.length === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      className="imp-btn imp-btn--ghost"
                      onClick={() => navigate(`/modules/training-ai/personas/${persona.id}`)}
                    >
                      Abrir →
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
