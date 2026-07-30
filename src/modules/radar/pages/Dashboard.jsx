import { Link } from 'react-router-dom'
import { useRadar } from '../context/RadarContext.jsx'

export default function RadarDashboardPage() {
  const { metrics, trends, insights, canInsights } = useRadar()

  return (
    <section className="imp-module">
      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Sinais ativos</p>
          <strong className="accent">{metrics.activeSignals}</strong>
          <span>Monitoramento contínuo</span>
        </article>
        <article className="imp-metric">
          <p>Tendências em alta</p>
          <strong className="success">{metrics.risingTrends}</strong>
          <span>Últimos 7 dias</span>
        </article>
        <article className="imp-metric">
          <p>Watchlist</p>
          <strong>{metrics.watchlist}</strong>
          <span>Contas observadas</span>
        </article>
        <article className="imp-metric">
          <p>Alertas hoje</p>
          <strong>{metrics.alertsToday}</strong>
          <span>Prioridade comercial</span>
        </article>
      </div>

      <div className="imp-actions">
        <Link to="/modules/radar/analise" className="imp-btn imp-btn--primary">
          Abrir análise de mercado
        </Link>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Dashboard de tendências</h2>
            <p>Momentum por tema monitorado.</p>
          </div>
        </div>
        <div className="imp-grid-2">
          {trends.map((trend) => (
            <article key={trend.id} className="imp-list-item" style={{ cursor: 'default' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <h3>{trend.title}</h3>
                  <span
                    className={`imp-pill ${
                      trend.direction === 'up'
                        ? 'imp-pill--green'
                        : trend.direction === 'down'
                          ? 'imp-pill--rose'
                          : 'imp-pill--muted'
                    }`}
                  >
                    {trend.momentum}
                  </span>
                </div>
                <p>
                  {trend.segment} ·{' '}
                  {trend.direction === 'up'
                    ? 'Em alta'
                    : trend.direction === 'down'
                      ? 'Em queda'
                      : 'Estável'}
                </p>
                <p>{trend.summary}</p>
                <div className="imp-progress" style={{ marginTop: '0.65rem' }}>
                  <span style={{ width: `${trend.momentum}%` }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Insights recentes</h2>
            <p>Sinais acionáveis para o time comercial.</p>
          </div>
        </div>
        <div className="imp-list">
          {insights.map((insight) => (
            <Link
              key={insight.id}
              to={canInsights ? `/modules/radar/insight/${insight.id}` : '#'}
              className="imp-list-item"
              style={{ textDecoration: 'none', pointerEvents: canInsights ? 'auto' : 'none' }}
            >
              <div>
                <h3>{insight.title}</h3>
                <p>
                  {insight.category} ·{' '}
                  {new Date(insight.publishedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span
                className={`imp-pill ${
                  insight.severity === 'alta' ? 'imp-pill--rose' : 'imp-pill--amber'
                }`}
              >
                {insight.severity}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
