import { useId } from 'react'
import { SoftHBarList } from './FluffyCharts.jsx'
import { closedSmoothPath } from '../utils/chartMath.js'

/** Radar chart from report section earned/total ratios. */
export default function SectionRadar({ sections = [], size = 240 }) {
  const uid = useId().replace(/:/g, '')
  const items = (sections || []).slice(0, 8).map((section) => {
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

  // A radar needs at least three axes to have an area; fewer sections read better as bars.
  if (items.length < 3) {
    return (
      <SoftHBarList
        rows={items.map((item) => ({ key: item.id, label: item.name, value: Math.round(item.ratio * 100), hint: item.label }))}
        max={100}
        tone="orange"
        formatValue={(value) => `${value}%`}
      />
    )
  }

  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.36
  const n = items.length

  function point(index, ratio) {
    const angle = -Math.PI / 2 + (index / n) * Math.PI * 2
    return {
      x: cx + Math.cos(angle) * maxR * ratio,
      y: cy + Math.sin(angle) * maxR * ratio,
    }
  }

  const valuePoints = items.map((item, index) => point(index, Math.max(0.1, item.ratio)))

  return (
    <div className="training-ai__radar">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="training-ai__radar-svg">
        <defs>
          <radialGradient id={`${uid}-fill`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--brand, #f59e0b)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--brand, #f59e0b)" stopOpacity="0.18" />
          </radialGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <circle key={r} cx={cx} cy={cy} r={maxR * r} className="training-ai__radar-ring" />
        ))}
        {items.map((item, index) => {
          const p = point(index, 1)
          return <line key={`axis_${item.id}`} x1={cx} y1={cy} x2={p.x} y2={p.y} className="training-ai__radar-axis" />
        })}
        <path d={closedSmoothPath(valuePoints)} className="training-ai__radar-halo" />
        <path d={closedSmoothPath(valuePoints)} fill={`url(#${uid}-fill)`} className="training-ai__radar-shape" />
        {valuePoints.map((p, index) => (
          <circle key={`pt_${items[index].id}`} cx={p.x} cy={p.y} r={3.5} className="training-ai__radar-point" />
        ))}
        {items.map((item, index) => {
          const p = point(index, 1.2)
          const anchor = Math.abs(p.x - cx) < 4 ? 'middle' : p.x > cx ? 'start' : 'end'
          return (
            <text key={`lbl_${item.id}`} x={p.x} y={p.y + 3} textAnchor={anchor} className="training-ai__radar-label">
              {item.name.length > 14 ? `${item.name.slice(0, 13)}…` : item.name}
            </text>
          )
        })}
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
