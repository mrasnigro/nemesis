import './MetricCard.css'

export default function MetricCard({ label, value, hint, trend, accent = 'cyan' }) {
  return (
    <article className={`metric-card metric-card--${accent}`}>
      <div className="metric-card__top">
        <span className="metric-card__label">{label}</span>
        {trend ? (
          <span className={`metric-card__trend metric-card__trend--${trend.direction}`}>
            {trend.direction === 'up' ? '▲' : '▼'} {trend.value}
          </span>
        ) : null}
      </div>
      <strong className="metric-card__value">{value}</strong>
      {hint ? <p className="metric-card__hint">{hint}</p> : null}
    </article>
  )
}
