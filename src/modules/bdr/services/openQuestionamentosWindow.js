import { OBJECTION_LIBRARY } from '../data/objections.js'

/**
 * Opens Questionamentos Padrão in a same-origin popup (live / PLUCK parity).
 */
export function openQuestionamentosWindow() {
  const categories = OBJECTION_LIBRARY.map((cat, index) => {
    const color = cat.color || '#94a3b8'
    const entries = cat.entries
      .map((entry, entryIndex) => {
        const label = escapeHtml(
          entry.label ||
            `[${String(entry.question || '')
              .replace(/^\[|\]$/g, '')
              .trim()
              .toUpperCase()}]`,
        )
        const subtitle = entry.subtitle
          ? `<span class="entry-sub">${escapeHtml(entry.subtitle)}</span>`
          : ''
        const paragraphs = (entry.paragraphs || (entry.answer ? [entry.answer] : []))
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join('')
        const ganchoLines = entry.ganchoLines || (entry.gancho ? [entry.gancho] : [])
        const gancho = ganchoLines.length
          ? `<div class="gancho">${
              entry.ganchoTitle
                ? `<p class="gancho-title">${escapeHtml(entry.ganchoTitle)}</p>`
                : ''
            }${ganchoLines.map((l) => `<p>${escapeHtml(l)}</p>`).join('')}</div>`
          : ''

        return `
      <details class="entry" ${index === 0 && entryIndex === 0 ? 'open' : ''}>
        <summary>
          <div>
            <strong style="color:${color}">${label}</strong>
            ${subtitle}
          </div>
          <span>▼</span>
        </summary>
        <div class="entry-body">
          ${paragraphs}
          ${gancho}
          <div class="resposta-wrap"><span class="resposta">[RESPOSTA]</span></div>
        </div>
      </details>`
      })
      .join('')

    return `
      <details class="cat" ${index === 0 ? 'open' : ''} style="--c:${color};background:color-mix(in srgb, ${color} 5%, transparent)">
        <summary>
          <div>
            <h3>${escapeHtml(cat.title.toUpperCase())} (${cat.entries.length})</h3>
            <p>${escapeHtml(cat.snippet || '')}</p>
          </div>
          <span>▼</span>
        </summary>
        <div class="cat-body">${entries}</div>
      </details>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Questionamentos Padrão</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, sans-serif;
      background: #0f172a;
      color: #cbd5e1;
      padding: 2rem;
    }
    .cat {
      border-left: 0.5rem solid var(--c, #94a3b8);
      border-radius: 0.75rem;
      margin-bottom: 3rem;
      overflow: hidden;
    }
    .cat > summary {
      list-style: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0 1.5rem;
      cursor: pointer;
    }
    .cat > summary::-webkit-details-marker { display: none; }
    .cat h3 {
      margin: 0;
      color: var(--c, #94a3b8);
      font-size: 1.125rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      line-height: 1.75rem;
    }
    .cat summary > span { color: var(--c, #94a3b8); font-size: 1.25rem; }
    .cat[open] > summary > span { display: inline-block; transform: rotate(180deg); }
    .cat p { margin: 0; color: #94a3b8; font-size: 0.875rem; line-height: 1.25rem; }
    .cat-body {
      margin-top: 2rem;
      padding-left: 1rem;
      border-left: 2px dashed #334155;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .entry {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      overflow: hidden;
    }
    .entry summary {
      list-style: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      cursor: pointer;
    }
    .entry summary::-webkit-details-marker { display: none; }
    .entry summary:hover { background: rgba(51, 65, 85, 0.5); }
    .entry-sub { display: block; color: #94a3b8; font-size: 0.875rem; font-weight: 400; }
    .entry summary > span { font-size: 0.75rem; color: #e2e8f0; }
    .entry[open] > summary > span { display: inline-block; transform: rotate(180deg); }
    .entry-body {
      padding: 1.5rem;
      border-top: 1px solid rgba(71, 85, 105, 0.4);
      background: rgba(30, 41, 59, 0.6);
      line-height: 1.625;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .entry-body p { margin: 0; }
    .gancho { padding-top: 0.5rem; }
    .gancho-title { font-weight: 700; color: #e2e8f0; }
    .resposta-wrap { margin-top: 0.25rem; }
    .resposta {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      background: rgba(239, 68, 68, 0.1);
      color: #ff4444;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.0375rem;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  ${categories}
</body>
</html>`

  const popup = window.open('', 'bdr-questionamentos', 'noopener,noreferrer,width=920,height=800')
  if (!popup) return false
  popup.document.write(html)
  popup.document.close()
  return true
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
