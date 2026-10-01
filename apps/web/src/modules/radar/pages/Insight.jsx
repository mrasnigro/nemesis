import { Link, useParams } from 'react-router-dom'
import { useRadar } from '../context/RadarContext.jsx'

export default function RadarInsightPage() {
  const { insightId } = useParams()
  const { getInsight, trends, canInsights } = useRadar()
  const insight = getInsight(insightId)

  if (!canInsights) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Sem permissão para abrir insights.</div>
      </section>
    )
  }

  if (!insight) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Insight não encontrado. <Link to="/modules/radar">Voltar</Link>
        </div>
      </section>
    )
  }

  const related = trends.find((trend) => trend.id === insight.trendId)

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to="/modules/radar" className="imp-btn imp-btn--ghost">
          ← Voltar ao dashboard
        </Link>
        <Link to="/modules/radar/analise" className="imp-btn imp-btn--primary">
          Rodar análise relacionada
        </Link>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>{insight.title}</h2>
            <p>
              {insight.category} ·{' '}
              {new Date(insight.publishedAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <span
            className={`imp-pill ${
              insight.severity === 'alta' ? 'imp-pill--rose' : 'imp-pill--amber'
            }`}
          >
            Severidade {insight.severity}
          </span>
        </div>

        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Sinais observados</h3>
        <ul style={{ margin: '0 0 1.25rem', paddingLeft: '1.1rem' }}>
          {insight.bullets.map((bullet) => (
            <li key={bullet} style={{ marginBottom: '0.4rem' }}>
              {bullet}
            </li>
          ))}
        </ul>

        <div className="imp-toast">{insight.recommendation}</div>

        {related ? (
          <div style={{ marginTop: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.9rem' }}>Tendência relacionada</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {related.title} — momentum {related.momentum}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
