import { useId, useRef, useState } from 'react'
import { niceMax, roundedTopBar, smoothPath, toneColor } from '../utils/chartMath.js'

function isNumber(value) {
  return value != null && value !== '' && Number.isFinite(Number(value))
}

function round(value) {
  return Math.round(value * 100) / 100
}

/** Runs of consecutive points that have a value; a missing day breaks the line instead of dropping to zero. */
function segmentsOf(points) {
  const out = []
  let current = []
  for (const point of points) {
    if (point.value == null) {
      if (current.length) out.push(current)
      current = []
    } else {
      current.push(point)
    }
  }
  if (current.length) out.push(current)
  return out
}

function formatValue(value, suffix = '') {
  if (!isNumber(value)) return '—'
  return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${suffix}`
}

function labelStride(count, target = 8) {
  if (count <= target) return 1
  return Math.ceil(count / target)
}

function ChartTooltip({ title, rows, xRatio }) {
  return (
    <div
      className="training-ai__chart-tooltip"
      style={{
        left: `${xRatio * 100}%`,
        transform: xRatio > 0.66 ? 'translate(calc(-100% - 10px), 0)' : 'translate(10px, 0)',
      }}
    >
      <strong>{title}</strong>
      <ul>
        {rows.map((row) => (
          <li key={row.key}>
            <span className="training-ai__dot" style={{ background: toneColor(row.tone) }} />
            {row.label}: {row.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Smooth area/line chart. `points` are `{ date, [key]: number|null }`; `series` is `{ key, label, tone }[]`.
 */
export function SmoothLineChart({
  points = [],
  series = [],
  valueSuffix = '',
  maxValue,
  formatLabel = (point) => point.date,
  axisLabel = formatLabel,
  ariaLabel = 'Série temporal',
  height = 210,
}) {
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)
  const width = 640
  const padL = 38
  const padR = 14
  const padT = 16
  const padB = 30
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const values = series.flatMap((item) => points.map((point) => point[item.key]).filter(isNumber).map(Number))
  const max = maxValue ?? niceMax(Math.max(0, ...values))
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio * 10) / 10)
  const stepX = points.length <= 1 ? 0 : plotW / (points.length - 1)
  const xAt = (index) => (points.length <= 1 ? padL + plotW / 2 : padL + index * stepX)
  const yAt = (value) => padT + plotH - (Math.min(Number(value) || 0, max) / max) * plotH
  const baseline = padT + plotH
  const stride = labelStride(points.length)

  const lines = series.map((item) => {
    const mapped = points.map((point, index) => ({
      x: xAt(index),
      y: isNumber(point[item.key]) ? yAt(point[item.key]) : null,
      value: isNumber(point[item.key]) ? Number(point[item.key]) : null,
    }))
    const segments = segmentsOf(mapped)
    return {
      ...item,
      color: toneColor(item.tone),
      gradientId: `${uid}-fill-${item.key}`,
      segments: segments.map((segment) => ({
        line: smoothPath(segment),
        area:
          segment.length > 1
            ? `${smoothPath(segment)} L ${round(segment[segment.length - 1].x)} ${baseline} L ${round(segment[0].x)} ${baseline} Z`
            : '',
        lonely: segment.length === 1 ? segment[0] : null,
      })),
      dots: mapped.filter((point) => point.value != null),
    }
  })

  function handlePointer(event) {
    const svg = svgRef.current
    if (!svg || points.length === 0) return
    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0) return
    const localX = ((event.clientX - rect.left) / rect.width) * width
    const t = (localX - padL) / plotW
    setHoverIndex(Math.round(Math.max(0, Math.min(1, t)) * (points.length - 1)))
  }

  const hoverPoint = hoverIndex == null ? null : points[hoverIndex]
  const hoverX = hoverIndex == null ? null : xAt(hoverIndex)
  const showDots = points.length <= 45

  return (
    <div className="training-ai__line-chart training-ai__fluffy-chart">
      <div className="training-ai__line-chart-frame">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
          onMouseMove={handlePointer}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {lines.map((line) => (
              <linearGradient key={line.gradientId} id={line.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={line.color} stopOpacity={series.length > 1 ? 0.22 : 0.38} />
                <stop offset="70%" stopColor={line.color} stopOpacity={0.06} />
                <stop offset="100%" stopColor={line.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={padL} y1={yAt(tick)} x2={width - padR} y2={yAt(tick)} className="training-ai__grid training-ai__grid--soft" />
              <text x={padL - 10} y={yAt(tick) + 3} textAnchor="end" className="training-ai__axis-label">
                {tick}
              </text>
            </g>
          ))}

          {lines.map((line) => (
            <g key={line.key}>
              {line.segments.map((segment, index) =>
                segment.area ? (
                  <path key={`area-${index}`} d={segment.area} fill={`url(#${line.gradientId})`} className="training-ai__fluffy-area" />
                ) : null,
              )}
              {line.segments.map((segment, index) =>
                segment.lonely ? null : (
                  <g key={`line-${index}`}>
                    <path d={segment.line} className="training-ai__fluffy-halo" stroke={line.color} fill="none" />
                    <path d={segment.line} className="training-ai__fluffy-line" stroke={line.color} fill="none" />
                  </g>
                ),
              )}
              {(showDots ? line.dots : line.segments.filter((s) => s.lonely).map((s) => s.lonely)).map((dot) => (
                <circle
                  key={`dot-${dot.x}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={3}
                  className="training-ai__fluffy-dot"
                  fill={line.color}
                />
              ))}
            </g>
          ))}

          {hoverPoint && hoverX != null ? (
            <g className="training-ai__chart-hover">
              <line x1={hoverX} y1={padT} x2={hoverX} y2={baseline} className="training-ai__crosshair" />
              {lines.map((line) =>
                isNumber(hoverPoint[line.key]) ? (
                  <g key={`hover-${line.key}`}>
                    <circle cx={hoverX} cy={yAt(hoverPoint[line.key])} r={9} fill={line.color} opacity={0.18} />
                    <circle cx={hoverX} cy={yAt(hoverPoint[line.key])} r={4.5} fill={line.color} className="training-ai__hover-dot" />
                  </g>
                ) : null,
              )}
            </g>
          ) : null}

          {points.map((point, index) => {
            const show = index === 0 || index === points.length - 1 || index % stride === 0
            if (!show) return null
            const nearEnd = index !== points.length - 1 && points.length - 1 - index < stride / 2
            if (nearEnd) return null
            return (
              <text key={`x-${point.date}-${index}`} x={xAt(index)} y={height - 8} textAnchor="middle" className="training-ai__axis-label">
                {axisLabel(point)}
              </text>
            )
          })}
        </svg>
        {hoverPoint && hoverX != null ? (
          <ChartTooltip
            title={formatLabel(hoverPoint)}
            xRatio={hoverX / width}
            rows={lines.map((line) => ({
              key: line.key,
              tone: line.tone,
              label: line.label || line.key,
              text: formatValue(hoverPoint[line.key], line.suffix ?? valueSuffix),
            }))}
          />
        ) : null}
      </div>
    </div>
  )
}

/**
 * Rounded, gradient-filled column chart. Each series may sit on the `left` (default) or `right` axis so a
 * score (0–100) and minutes can share one chart without flattening each other.
 */
export function SoftBarChart({
  points = [],
  series = [],
  formatLabel = (point) => point.date,
  axisLabel = formatLabel,
  ariaLabel = 'Gráfico de barras',
  height = 210,
}) {
  const uid = useId().replace(/:/g, '')
  const [hoverIndex, setHoverIndex] = useState(null)
  const width = 640
  const hasRight = series.some((item) => item.axis === 'right')
  const padL = 38
  const padR = hasRight ? 38 : 14
  const padT = 16
  const padB = 30
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const baseline = padT + plotH

  const maxFor = (axis) =>
    niceMax(
      Math.max(
        0,
        ...series
          .filter((item) => (item.axis || 'left') === axis)
          .flatMap((item) => points.map((point) => point[item.key]).filter(isNumber).map(Number)),
      ),
    )
  const maxLeft = series.find((item) => (item.axis || 'left') === 'left')?.max ?? maxFor('left')
  const maxRight = series.find((item) => item.axis === 'right')?.max ?? maxFor('right')
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  const slot = points.length ? plotW / points.length : plotW
  const groupW = Math.min(slot * 0.72, 46)
  const barGap = series.length > 1 ? Math.min(4, groupW * 0.08) : 0
  const barW = Math.max(2, (groupW - barGap * (series.length - 1)) / Math.max(1, series.length))
  const stride = labelStride(points.length)

  return (
    <div className="training-ai__line-chart training-ai__fluffy-chart">
      <div className="training-ai__line-chart-frame">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} onMouseLeave={() => setHoverIndex(null)}>
          <defs>
            {series.map((item) => (
              <linearGradient key={item.key} id={`${uid}-bar-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={toneColor(item.tone)} stopOpacity={0.95} />
                <stop offset="100%" stopColor={toneColor(item.tone)} stopOpacity={0.35} />
              </linearGradient>
            ))}
          </defs>

          {ticks.map((ratio) => {
            const y = padT + plotH - ratio * plotH
            return (
              <g key={`t-${ratio}`}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} className="training-ai__grid training-ai__grid--soft" />
                <text x={padL - 10} y={y + 3} textAnchor="end" className="training-ai__axis-label">
                  {Math.round(maxLeft * ratio * 10) / 10}
                </text>
                {hasRight ? (
                  <text x={width - padR + 10} y={y + 3} textAnchor="start" className="training-ai__axis-label">
                    {Math.round(maxRight * ratio * 10) / 10}
                  </text>
                ) : null}
              </g>
            )
          })}

          {points.map((point, index) => {
            const slotX = padL + index * slot
            const groupX = slotX + (slot - groupW) / 2
            const hovered = hoverIndex === index
            return (
              <g key={`${point.date}-${index}`} onMouseEnter={() => setHoverIndex(index)}>
                <rect
                  x={slotX + 1}
                  y={padT}
                  width={Math.max(0, slot - 2)}
                  height={plotH}
                  rx={8}
                  className={`training-ai__fluffy-slot${hovered ? ' is-hover' : ''}`}
                />
                {series.map((item, seriesIndex) => {
                  const value = point[item.key]
                  if (!isNumber(value) || Number(value) <= 0) return null
                  const max = item.axis === 'right' ? maxRight : maxLeft
                  const h = Math.max(3, (Math.min(Number(value), max) / max) * plotH)
                  const x = groupX + seriesIndex * (barW + barGap)
                  return (
                    <path
                      key={item.key}
                      d={roundedTopBar(x, baseline - h, barW, h, 7)}
                      fill={`url(#${uid}-bar-${item.key})`}
                      className="training-ai__fluffy-bar"
                    />
                  )
                })}
              </g>
            )
          })}

          {points.map((point, index) => {
            const show = index === 0 || index === points.length - 1 || index % stride === 0
            if (!show) return null
            const nearEnd = index !== points.length - 1 && points.length - 1 - index < stride / 2
            if (nearEnd) return null
            return (
              <text
                key={`x-${point.date}-${index}`}
                x={padL + index * slot + slot / 2}
                y={height - 8}
                textAnchor="middle"
                className="training-ai__axis-label"
              >
                {axisLabel(point)}
              </text>
            )
          })}
        </svg>
        {hoverIndex != null && points[hoverIndex] ? (
          <ChartTooltip
            title={formatLabel(points[hoverIndex])}
            xRatio={(padL + hoverIndex * slot + slot / 2) / width}
            rows={series.map((item) => ({
              key: item.key,
              tone: item.tone,
              label: item.label || item.key,
              text: formatValue(points[hoverIndex][item.key], item.suffix || ''),
            }))}
          />
        ) : null}
      </div>
    </div>
  )
}

/** Horizontal rounded bars for category comparisons (e.g. average score per playbook). */
export function SoftHBarList({ rows = [], max = 100, tone = 'purple', formatValue: format = (value) => value }) {
  const color = toneColor(tone)
  return (
    <ul className="training-ai__hbar-list">
      {rows.map((row) => {
        const value = Number(row.value) || 0
        const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
        return (
          <li key={row.key}>
            <div className="training-ai__hbar-head">
              <span title={row.label}>{row.label}</span>
              <strong>{format(value)}</strong>
            </div>
            <span className="training-ai__hbar-track">
              <span
                className="training-ai__hbar-fill"
                style={{
                  width: `${Math.max(pct, value > 0 ? 3 : 0)}%`,
                  background: `linear-gradient(90deg, color-mix(in srgb, ${color} 45%, transparent), ${color})`,
                  boxShadow: `0 0 14px color-mix(in srgb, ${color} 35%, transparent)`,
                }}
              />
            </span>
            {row.hint ? <small>{row.hint}</small> : null}
          </li>
        )
      })}
    </ul>
  )
}
