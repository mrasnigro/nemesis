/** SVG weight ring — section contribution toward 100. */

export default function WeightRing({ sections = [], size = 148, stroke = 12 }) {
  const total = sections.reduce((sum, s) => sum + (Number(s.weight) || 0), 0) || 100
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#f43f5e', '#06b6d4']

  let offset = 0
  const arcs = sections.map((section, index) => {
    const weight = Number(section.weight) || 0
    const length = (weight / total) * circumference
    const dashOffset = -offset
    offset += length
    return {
      id: section.id || `arc_${index}`,
      length,
      dashOffset,
      color: colors[index % colors.length],
      name: section.name,
      weight,
    }
  })

  return (
    <div className="training-ai__weight-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(55,65,81,0.85)"
          strokeWidth={stroke}
        />
        {arcs.map((arc) => (
          <circle
            key={arc.id}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeDasharray={`${arc.length} ${circumference - arc.length}`}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </svg>
      <div className="training-ai__weight-ring-label">
        <strong>{Math.round(total)}</strong>
        <span>Score total</span>
      </div>
    </div>
  )
}
