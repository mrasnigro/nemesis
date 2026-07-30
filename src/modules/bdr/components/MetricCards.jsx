import { useBdrSession } from '../hooks/useBdrSession.js'

export default function MetricCards() {
  const { metrics } = useBdrSession()

  const cards = [
    {
      id: 'total',
      label: 'Total de Ligações',
      value: String(metrics.totalCalls),
      hint: `↑ ${metrics.weekDeltaPercent}% vs semana anterior`,
      hintTone: 'up',
    },
    {
      id: 'today',
      label: 'Ligações Hoje',
      value: String(metrics.callsToday),
      hint: `Meta: ${metrics.callsGoal} ligações`,
      hintTone: 'warn',
    },
    {
      id: 'duration',
      label: 'Duração Média',
      value: metrics.averageDurationLabel,
      hint: 'Última semana',
      hintTone: 'muted',
    },
    {
      id: 'meetings',
      label: 'Reuniões Agendadas',
      value: String(metrics.meetingsScheduled),
      hint: `Meta: ${metrics.meetingsGoal} agendamentos`,
      hintTone: 'up',
    },
  ]

  return (
    <div className="bdr-home__metrics">
      {cards.map((metric) => (
        <article key={metric.id} className="bdr-home__metric">
          <p>{metric.label}</p>
          <strong>{metric.value}</strong>
          <span className={`bdr-home__hint bdr-home__hint--${metric.hintTone}`}>{metric.hint}</span>
        </article>
      ))}
    </div>
  )
}
