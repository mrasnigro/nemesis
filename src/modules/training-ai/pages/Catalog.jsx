import { Link, useNavigate } from 'react-router-dom'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingCatalogPage() {
  const navigate = useNavigate()
  const { metrics, scenarios, history, canSimulate, startSimulation } = useTrainingAi()

  function handleStart(scenarioId) {
    const started = startSimulation(scenarioId)
    if (started) navigate(`/modules/training-ai/simulacao/${scenarioId}`)
  }

  return (
    <section className="imp-module">
      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Simulações concluídas</p>
          <strong className="accent">{metrics.completed}</strong>
          <span>Este mês</span>
        </article>
        <article className="imp-metric">
          <p>Score médio</p>
          <strong>{metrics.avgScore}</strong>
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
          <span>Trilha recomendada</span>
        </article>
      </div>

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Selecionar treinamento</h2>
              <p>Escolha um cenário e inicie a simulação com IA.</p>
            </div>
          </div>
          <div className="imp-list">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="imp-list-item" style={{ cursor: 'default' }}>
                <div>
                  <h3>{scenario.title}</h3>
                  <p>
                    {scenario.segment} · {DIFFICULTY_LABELS[scenario.difficulty]} ·{' '}
                    {scenario.durationMin} min
                  </p>
                  <p>{scenario.description}</p>
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
            ))}
          </div>
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Últimas avaliações</h2>
              <p>Histórico desta sessão (mock).</p>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="imp-empty">Nenhuma simulação concluída ainda.</div>
          ) : (
            <div className="imp-list">
              {history.map((item) => (
                <Link
                  key={`${item.scenarioId}-${item.completedAt}`}
                  to={`/modules/training-ai/relatorio/${item.scenarioId}`}
                  className="imp-list-item"
                  style={{ textDecoration: 'none' }}
                >
                  <div>
                    <h3>{item.scenarioTitle}</h3>
                    <p>{new Date(item.completedAt).toLocaleString('pt-BR')}</p>
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
