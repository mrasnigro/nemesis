import { Link } from 'react-router-dom'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import '../styles/training-ai.css'

export default function TrainingHistoryPage() {
  const { history, canReport } = useTrainingAi()

  if (!canReport) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Sem permissão para ver histórico.</div>
      </section>
    )
  }

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to="/modules/training-ai" className="imp-btn imp-btn--ghost">
          ← Voltar ao catálogo
        </Link>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Histórico de simulações</h2>
            <p>Sessões concluídas nesta sessão do navegador (mock).</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="imp-empty">Nenhuma simulação concluída ainda.</div>
        ) : (
          <div className="imp-list">
            {history.map((item) => (
              <Link
                key={`${item.id}-${item.completedAt}`}
                to={`/modules/training-ai/relatorio/${item.scenarioId}`}
                className="imp-list-item"
                style={{ textDecoration: 'none' }}
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
