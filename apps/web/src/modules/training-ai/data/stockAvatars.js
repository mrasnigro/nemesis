/** Deterministic stock avatar presets for the Escolher Avatar gallery (no external image CDN). */

const PALETTE = [
  ['#0ea5e9', '#0369a1'],
  ['#f59e0b', '#b45309'],
  ['#10b981', '#047857'],
  ['#a855f7', '#6d28d9'],
  ['#f43f5e', '#be123c'],
  ['#06b6d4', '#0e7490'],
  ['#84cc16', '#4d7c0f'],
  ['#e11d48', '#9f1239'],
  ['#6366f1', '#4338ca'],
  ['#14b8a6', '#0f766e'],
  ['#fb923c', '#c2410c'],
  ['#8b5cf6', '#5b21b6'],
]

function svgDataUrl(from, to, initials) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
    </linearGradient></defs>
    <circle cx="80" cy="80" r="80" fill="url(#g)"/>
    <text x="80" y="92" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="48" font-weight="700">${initials}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const INITIALS = [
  'MC', 'RS', 'HP', 'CA', 'GL', 'AN', 'BR', 'DF', 'EL', 'FT', 'JV', 'LM',
  'NP', 'OR', 'PQ', 'ST', 'UV', 'WX', 'YZ', 'AB', 'CD', 'EF', 'GH', 'IJ',
]

export const STOCK_AVATARS = INITIALS.map((initials, index) => {
  const [from, to] = PALETTE[index % PALETTE.length]
  return {
    id: `stock_${index + 1}`,
    initials,
    src: svgDataUrl(from, to, initials),
  }
})

export const AVATAR_PAGE_SIZE = 12
