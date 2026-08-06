import { Link, useNavigate } from 'react-router-dom'
import AgentAvatar from '../components/AgentAvatar.jsx'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingCatalogPage() {
  const navigate = useNavigate()
  const {
    metrics,
    scenarios,
    history,
    canSimulate,
    canManage,
    startSimulation,
    getPersona,
    getEvaluationTemplate,
  } = useTrainingAi()

  function handleStart(scenarioId) {
    const started = startSimulation(scenarioId)
    if (started) navigate(`/modules/training-ai/simulacao/${scenarioId}`)
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Catálogo de simulações</h2>
          <p>
            Escolha um cenário, pratique com um agente e revise a Central de Insights após o
            treino.
          </p>
        </div>
        <div className="training-ai__page-header-actions">
          <Link to="/modules/training-ai/historico" className="imp-btn imp-btn--ghost">
            Central de Insights
          </Link>
          {canManage ? (
            <Link to="/modules/training-ai/cenarios/novo" className="imp-btn imp-btn--primary">
              + Novo cenário
            </Link>
          ) : null}
        </div>
      </header>

      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Simulações concluídas</p>
          <strong className="accent">{metrics.completed}</strong>
          <span>Nesta sessão</span>
        </article>
        <article className="imp-metric">
          <p>Score médio</p>
          <strong>{metrics.avgScore || '—'}</strong>
          <span>Meta: 80</span>
        </article>
        <article className="imp-metric">
          <p>Sequência</p>
          <strong className="success">{metrics.streakDays}d</strong>
          <span>Dias consecutivos</span>
        </article>
        <article className="imp-metric">
          <p>Pendentes</p>
          <strong>{metrics.pending}</strong>
          <span>Cenários sem conclusão</span>
        </article>
      </div>

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Iniciar treinamento</h2>
              <p>Cenário + agente + playbook → conversa por texto.</p>
            </div>
            <Link to="/modules/training-ai/cenarios" className="imp-btn imp-btn--ghost">
              Gerenciar cenários
            </Link>
          </div>
          {scenarios.length === 0 ? (
            <div className="training-ai__empty">
              <h3>Nenhum cenário disponível</h3>
              <p>Crie um cenário para liberar o primeiro treino.</p>
            </div>
          ) : (
            <div className="imp-list">
              {scenarios.map((scenario) => {
                const persona = getPersona(scenario.personaId)
                const template = getEvaluationTemplate(scenario.evaluationTemplateId)
                return (
                  <div key={scenario.id} className="training-ai__scenario-practice-card">
                    <AgentAvatar
                      id={persona?.id || scenario.id}
                      name={persona?.name || scenario.title}
                      size="md"
                    />
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--text-h)', fontSize: '1.02rem' }}>
                        <Link to={`/modules/training-ai/cenarios/${scenario.id}`}>
                          {scenario.title}
                        </Link>
                      </h3>
                      <p className="training-ai__scenario-meta">
                        {scenario.funnelStage} · {DIFFICULTY_LABELS[scenario.difficulty]} ·{' '}
                        {scenario.durationMin} min
                        {persona ? ` · ${persona.name}` : ''}
                        {template ? ` · ${template.title}` : ''}
                      </p>
                      <p className="training-ai__scenario-objective">
                        {scenario.objective || scenario.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="imp-btn imp-btn--primary"
                      disabled={!canSimulate}
                      onClick={() => handleStart(scenario.id)}
                    >
                      Simular
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Últimos insights</h2>
              <p>Relatórios recentes desta sessão.</p>
            </div>
            <Link to="/modules/training-ai/historico" className="imp-btn imp-btn--ghost">
              Ver todos
            </Link>
          </div>
          {history.length === 0 ? (
            <div className="training-ai__empty">
              <h3>Nenhuma simulação concluída</h3>
              <p>Inicie um cenário para gerar o primeiro relatório na Central de Insights.</p>
            </div>
          ) : (
            <div className="imp-list">
              {history.slice(0, 5).map((item) => (
                <Link
                  key={`${item.sessionId || item.id}-${item.completedAt}`}
                  to={
                    item.sessionId
                      ? `/modules/training-ai/relatorio/sessao/${item.sessionId}`
                      : `/modules/training-ai/relatorio/${item.scenarioId}`
                  }
                  className="imp-list-item"
                >
                  <div>
                    <h3>{item.scenarioTitle}</h3>
                    <p>
                      {item.personaName} · {new Date(item.completedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span className="imp-pill imp-pill--amber">{item.score} pts</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
