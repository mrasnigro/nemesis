/** Trigger a browser download for a CSV (or other text) blob. */

export function downloadTextFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename, lines) {
  downloadTextFile(filename, Array.isArray(lines) ? lines.join('\n') : String(lines || ''))
}
