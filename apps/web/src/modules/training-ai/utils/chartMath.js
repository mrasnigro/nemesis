/** Shared colour and geometry helpers for the training charts. */

export const CHART_TONES = {
  orange: 'var(--brand, #f59e0b)',
  purple: 'var(--chart-purple, #a78bfa)',
  blue: 'var(--link, #60a5fa)',
  green: '#34d399',
  pink: '#f472b6',
  cyan: '#22d3ee',
  amber: '#fbbf24',
  rose: '#fb7185',
}

export const SERIES_TONES = ['purple', 'orange', 'blue', 'green', 'pink', 'cyan', 'amber', 'rose']

/** Section colours of the playbook weight ring, in section order. */
export const RING_COLORS = ['#f59e0b', '#60a5fa', '#34d399', '#a78bfa', '#fb7185', '#22d3ee']

export function toneColor(tone) {
  return CHART_TONES[tone] || CHART_TONES.orange
}

export function niceMax(value) {
  const n = Math.max(Number(value) || 0, 1)
  if (n <= 4) return 4
  if (n <= 10) return 10
  if (n <= 100) return Math.ceil(n / 10) * 10
  return Math.ceil(n / 25) * 25
}

function round(value) {
  return Math.round(value * 100) / 100
}

/**
 * Monotone cubic curve through the points (Fritsch–Carlson tangents): soft like a spline, but it never
 * overshoots between two samples, so a smooth line still reads the true values.
 */
export function smoothPath(points) {
  const n = points.length
  if (n === 0) return ''
  if (n === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`
  const dx = []
  const slope = []
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x || 1e-6
    slope[i] = (points[i + 1].y - points[i].y) / dx[i]
  }
  const tangent = new Array(n)
  tangent[0] = slope[0]
  tangent[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) {
      tangent[i] = 0
    } else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      tangent[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i])
    }
  }
  let d = `M ${round(points[0].x)} ${round(points[0].y)}`
  for (let i = 0; i < n - 1; i += 1) {
    const third = dx[i] / 3
    const c1x = points[i].x + third
    const c1y = points[i].y + tangent[i] * third
    const c2x = points[i + 1].x - third
    const c2y = points[i + 1].y - tangent[i + 1] * third
    d += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(points[i + 1].x)} ${round(points[i + 1].y)}`
  }
  return d
}

/** Closed Catmull–Rom curve through the points, as cubic Béziers: a soft blob instead of a sharp polygon. */
export function closedSmoothPath(points) {
  const n = points.length
  if (!n) return ''
  const at = (index) => points[(index + n) % n]
  let d = `M ${round(points[0].x)} ${round(points[0].y)}`
  for (let i = 0; i < n; i += 1) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(p2.x)} ${round(p2.y)}`
  }
  return `${d} Z`
}

/** Column with rounded top corners, sitting on the baseline. */
export function roundedTopBar(x, y, w, h, radius) {
  if (h <= 0) return ''
  const r = Math.min(radius, w / 2, h)
  return [
    `M ${round(x)} ${round(y + h)}`,
    `V ${round(y + r)}`,
    `Q ${round(x)} ${round(y)} ${round(x + r)} ${round(y)}`,
    `H ${round(x + w - r)}`,
    `Q ${round(x + w)} ${round(y)} ${round(x + w)} ${round(y + r)}`,
    `V ${round(y + h)}`,
    'Z',
  ].join(' ')
}
