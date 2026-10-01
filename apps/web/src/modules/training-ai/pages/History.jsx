import { Link } from 'react-router-dom'
import AgentAvatar from '../components/AgentAvatar.jsx'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingHistoryPage() {
  const { history, canReport, canSimulate } = useTrainingAi()

  if (!canReport) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Você não tem acesso à Central de Insights.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Central de Insights</h2>
          <p>Histórico de simulações com score, agente e playbook — abra para analisar.</p>
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
            <h3>Nenhuma análise disponível</h3>
            <p>Conclua um treinamento para ver o repositório de insights.</p>
            <div className="imp-actions">
              {canSimulate ? (
                <Link to="/modules/training-ai" className="imp-btn imp-btn--primary">
                  Iniciar simulação
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="imp-list">
            {history.map((item) => (
              <Link
                key={`${item.sessionId || item.id}-${item.completedAt}`}
                to={
                  item.sessionId
                    ? `/modules/training-ai/relatorio/sessao/${item.sessionId}`
                    : `/modules/training-ai/relatorio/${item.scenarioId}`
                }
                className="imp-list-item"
              >
                <div className="training-ai__chip-row">
                  <AgentAvatar id={item.id} name={item.personaName} size="sm" />
                  <div>
                    <h3>Simulação · {item.scenarioTitle}</h3>
                    <p>
                      {item.personaName} · {item.templateTitle} ·{' '}
                      {new Date(item.completedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <span className={`imp-pill imp-pill--${item.band?.tone || 'amber'}`}>
                  {item.score}/100 · {item.band?.label || '—'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
