/** Reads a newline-delimited JSON body row by row as it arrives. */
export async function readNdjson(response, onRow) {
  const handle = (line) => {
    const row = line.trim()
    if (!row) return
    let parsed
    try {
      parsed = JSON.parse(row)
    } catch {
      return // a damaged row is skipped; the stream still ends with its own verdict
    }
    onRow(parsed)
  }
  if (!response.body?.getReader) {
    ;(await response.text()).split('\n').forEach(handle)
    return
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let pending = ''
  for (;;) {
    const { value, done } = await reader.read()
    pending += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = pending.split('\n')
    pending = lines.pop() ?? ''
    lines.forEach(handle)
    if (done) break
  }
  handle(pending)
}
