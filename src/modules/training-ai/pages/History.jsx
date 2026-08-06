import { Link } from 'react-router-dom'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingHistoryPage() {
  const { history, canReport, canSimulate } = useTrainingAi()

  if (!canReport) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Você não tem acesso ao histórico de simulações.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Histórico de simulações</h2>
          <p>Sessões concluídas nesta sessão de navegação.</p>
        </div>
        <div className="training-ai__page-header-actions">
          <Link to="/modules/training-ai" className="imp-btn imp-btn--primary">
            Ir ao catálogo
          </Link>
        </div>
      </header>

      <div className="imp-panel">
        {history.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhuma simulação concluída</h3>
            <p>Conclua um treinamento no catálogo para ver relatórios aqui.</p>
            <div className="imp-actions">
              {canSimulate ? (
                <Link to="/modules/training-ai" className="imp-btn imp-btn--primary">
                  Iniciar no catálogo
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="imp-list">
            {history.map((item) => (
              <Link
                key={`${item.id}-${item.completedAt}`}
                to={`/modules/training-ai/relatorio/${item.scenarioId}`}
                className="imp-list-item"
              >
                <div>
                  <h3>{item.scenarioTitle}</h3>
                  <p>
                    {item.personaName} · {item.templateTitle} ·{' '}
                    {new Date(item.completedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span className={`imp-pill imp-pill--${item.band?.tone || 'amber'}`}>
                  {item.score} pts · {item.band?.label || '—'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
