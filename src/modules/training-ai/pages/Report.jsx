import { Link, useParams } from 'react-router-dom'
import { scoreBand } from '../data/catalogs.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingReportPage() {
  const { scenarioId } = useParams()
  const { evaluation, history, canReport, resetSimulation } = useTrainingAi()

  const report =
    (evaluation?.scenarioId === scenarioId && evaluation) ||
    history.find((item) => item.scenarioId === scenarioId) ||
    null

  if (!canReport) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Sem permissão para ver relatórios.</div>
      </section>
    )
  }

  if (!report) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Relatório indisponível.{' '}
          <Link to="/modules/training-ai">Voltar ao catálogo</Link>
        </div>
      </section>
    )
  }

  const band = scoreBand(report.score)

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link
          to="/modules/training-ai"
          className="imp-btn imp-btn--ghost"
          onClick={resetSimulation}
        >
          ← Novo treinamento
        </Link>
        <Link
          to={`/modules/training-ai/simulacao/${scenarioId}`}
          className="imp-btn imp-btn--primary"
          onClick={resetSimulation}
        >
          Refazer simulação
        </Link>
      </div>

      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Score final</p>
          <strong className="accent">{report.score}</strong>
          <span className={`imp-pill imp-pill--${band.tone}`}>{band.label}</span>
        </article>
        {report.dimensions.map((dim) => (
          <article key={dim.id} className="imp-metric">
            <p>{dim.label}</p>
            <strong>{dim.value}</strong>
            <div className="imp-progress" style={{ marginTop: '0.55rem' }}>
              <span style={{ width: `${dim.value}%` }} />
            </div>
          </article>
        ))}
      </div>

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Pontos fortes</h2>
              <p>{report.scenarioTitle}</p>
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {report.strengths.map((item) => (
              <li key={item} style={{ marginBottom: '0.45rem' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Melhorias sugeridas</h2>
              <p>Coach IA</p>
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)' }}>
            {report.improvements.map((item) => (
              <li key={item} style={{ marginBottom: '0.45rem' }}>
                {item}
              </li>
            ))}
          </ul>
          <p style={{ marginTop: '1rem', color: 'var(--text-h)' }}>{report.coachNotes}</p>
        </div>
      </div>
    </section>
  )
}
