/** Trigger a browser download for a CSV (or other text) blob. */

export function downloadTextFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Some browsers start the download after the click handler returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** One CSV cell: quoted when it holds a separator, quote or line break. */
export function csvCell(value) {
  const text = value == null ? '' : String(value)
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function csvRow(values) {
  return values.map(csvCell).join(',')
}

/** `lines` are ready-made rows; a BOM keeps accents intact when the file opens in Excel. */
export function downloadCsv(filename, lines) {
  const body = Array.isArray(lines) ? lines.join('\r\n') : String(lines || '')
  downloadTextFile(filename, `\uFEFF${body}`)
}
