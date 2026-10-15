/**
 * Cuts a reply into sentences while it is still being written, so each one can be turned into speech and
 * played before the model has finished the next.
 */

/** Shorter pieces ("Sr.", "Ok.") are held back and joined with what follows. */
const MIN_CHARS = 14
const ENDING = new Set(['.', '!', '?', '…', '\n'])
const TRAILING = /[.!?…"')\]]/
const SPACE = /\s/

/**
 * @param buffer text not yet handed over
 * @param final true once the model is done: whatever is left is a sentence too
 * @returns the complete sentences, and the unfinished rest to pass back with the next piece
 */
export function takeSentences(buffer: string, final: boolean): { sentences: string[]; rest: string } {
  const sentences: string[] = []
  let start = 0

  for (let index = 0; index < buffer.length; index += 1) {
    const char = buffer[index]
    if (!ENDING.has(char)) continue
    let end = index
    while (end + 1 < buffer.length && TRAILING.test(buffer[end + 1])) end += 1
    const next = buffer[end + 1]
    const hard = char === '\n'
    if (next === undefined && !final && !hard) break // "3." may become "3.5": wait for the next piece
    if (!hard && next !== undefined && !SPACE.test(next)) {
      index = end // "3.5", "e.g.x": not a sentence end
      continue
    }
    const candidate = buffer.slice(start, end + 1).trim()
    if (candidate.length < MIN_CHARS && !(final && next === undefined)) {
      index = end
      continue
    }
    if (candidate) sentences.push(candidate)
    start = end + 1
    index = end
  }

  const rest = buffer.slice(start)
  if (final) {
    const tail = rest.trim()
    if (tail) sentences.push(tail)
    return { sentences, rest: '' }
  }
  return { sentences, rest }
}
