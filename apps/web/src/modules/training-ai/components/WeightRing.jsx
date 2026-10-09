import { RING_COLORS as COLORS } from '../utils/chartMath.js'

/** SVG weight ring — section contribution toward 100. */

export default function WeightRing({ sections = [], size = 148, stroke = 12 }) {
  const total = sections.reduce((sum, s) => sum + (Number(s.weight) || 0), 0) || 100
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const visible = sections.filter((section) => Number(section.weight) > 0)
  // Round caps reach half a stroke past each end, so leave room for them plus a small breath between arcs.
  const gap = visible.length > 1 ? stroke + 4 : 0

  let offset = 0
  const arcs = sections.map((section, index) => {
    const weight = Number(section.weight) || 0
    const length = (weight / total) * circumference
    const dashOffset = -(offset + gap / 2)
    offset += length
    return {
      id: section.id || `arc_${index}`,
      length: Math.max(0.01, length - gap),
      dashOffset,
      color: COLORS[index % COLORS.length],
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
          stroke="rgba(148,163,184,0.14)"
          strokeWidth={stroke}
        />
        {arcs
          .filter((arc) => arc.weight > 0)
          .map((arc) => (
            <g key={arc.id} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeOpacity={0.18}
                strokeWidth={stroke + 6}
                strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                strokeDashoffset={arc.dashOffset}
                strokeLinecap="round"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={stroke}
                strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                strokeDashoffset={arc.dashOffset}
                strokeLinecap="round"
              />
            </g>
          ))}
      </svg>
      <div className="training-ai__weight-ring-label">
        <strong>{Math.round(total)}</strong>
        <span>Score total</span>
      </div>
    </div>
  )
}
