import { Link, useNavigate } from 'react-router-dom'
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
          <h2>Catálogo de treinamentos</h2>
          <p>Escolha um cenário, pratique a conversa e revise o feedback da rubrica.</p>
        </div>
        <div className="training-ai__page-header-actions">
          <Link to="/modules/training-ai/historico" className="imp-btn imp-btn--ghost">
            Histórico
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
              <h2>Selecionar treinamento</h2>
              <p>Cenário + persona + rubrica → conversa por texto.</p>
            </div>
            <Link to="/modules/training-ai/cenarios" className="imp-btn imp-btn--ghost">
              Gerenciar cenários
            </Link>
          </div>
          {scenarios.length === 0 ? (
            <div className="training-ai__empty">
              <h3>Nenhum cenário disponível</h3>
              <p>Crie um cenário para iniciar o primeiro treinamento.</p>
              <div className="imp-actions">
                {canManage ? (
                  <Link
                    to="/modules/training-ai/cenarios/novo"
                    className="imp-btn imp-btn--primary"
                  >
                    + Novo cenário
                  </Link>
                ) : (
                  <Link to="/modules/training-ai/cenarios" className="imp-btn imp-btn--ghost">
                    Ver cenários
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="imp-list">
              {scenarios.map((scenario) => {
                const persona = getPersona(scenario.personaId)
                const template = getEvaluationTemplate(scenario.evaluationTemplateId)
                return (
                  <div key={scenario.id} className="imp-list-item">
                    <div>
                      <h3>
                        <Link to={`/modules/training-ai/cenarios/${scenario.id}`}>
                          {scenario.title}
                        </Link>
                      </h3>
                      <p className="training-ai__scenario-meta">
                        {scenario.funnelStage} · {scenario.industry || scenario.segment} ·{' '}
                        {DIFFICULTY_LABELS[scenario.difficulty]} · {scenario.durationMin} min
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
                      Iniciar
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
              <h2>Últimas avaliações</h2>
              <p>Resultados recentes desta sessão de navegação.</p>
            </div>
            <Link to="/modules/training-ai/historico" className="imp-btn imp-btn--ghost">
              Ver histórico
            </Link>
          </div>
          {history.length === 0 ? (
            <div className="training-ai__empty">
              <h3>Nenhuma simulação concluída</h3>
              <p>Inicie um cenário ao lado para gerar o primeiro relatório.</p>
              <div className="imp-actions">
                <span className="training-ai__meta">Escolha um treinamento e clique em Iniciar.</span>
              </div>
            </div>
          ) : (
            <div className="imp-list">
              {history.slice(0, 5).map((item) => (
                <Link
                  key={`${item.id}-${item.completedAt}`}
                  to={`/modules/training-ai/relatorio/${item.scenarioId}`}
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
