/** Radar chart from report section earned/total ratios. */

export default function SectionRadar({ sections = [], size = 220 }) {
  const items = (sections || []).slice(0, 6).map((section) => {
    const total = Number(section.totalWeight) || 0
    const earned = Number(section.earnedWeight) || 0
    const ratio = total > 0 ? Math.max(0, Math.min(1, earned / total)) : 0
    return {
      id: section.id,
      name: section.name,
      ratio,
      label: `${section.passedCount || 0}/${section.totalCount || 0}`,
    }
  })

  if (!items.length) {
    return <div className="training-ai__radar-empty">Sem seções para radar.</div>
  }

  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.32
  const n = items.length

  function point(index, ratio) {
    const angle = (-Math.PI / 2) + (index / n) * Math.PI * 2
    return {
      x: cx + Math.cos(angle) * maxR * ratio,
      y: cy + Math.sin(angle) * maxR * ratio,
    }
  }

  function poly(ratio) {
    return items
      .map((_, index) => {
        const p = point(index, ratio)
        return `${p.x},${p.y}`
      })
      .join(' ')
  }

  const valuePoly = items
    .map((item, index) => {
      const p = point(index, Math.max(0.08, item.ratio))
      return `${p.x},${p.y}`
    })
    .join(' ')

  return (
    <div className="training-ai__radar">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {[0.33, 0.66, 1].map((r) => (
          <polygon
            key={r}
            points={poly(r)}
            fill="none"
            stroke="rgba(55,65,81,0.9)"
            strokeWidth="1"
          />
        ))}
        {items.map((_, index) => {
          const p = point(index, 1)
          return (
            <line
              key={`axis_${index}`}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="rgba(55,65,81,0.75)"
              strokeWidth="1"
            />
          )
        })}
        <polygon
          points={valuePoly}
          fill="rgba(245,158,11,0.28)"
          stroke="#f59e0b"
          strokeWidth="2"
        />
      </svg>
      <ul className="training-ai__radar-legend">
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <strong>{Math.round(item.ratio * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
