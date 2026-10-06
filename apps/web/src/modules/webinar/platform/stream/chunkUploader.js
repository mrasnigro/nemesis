/**
 * Sends the recording to the server one piece at a time, in order.
 *
 * The old studio fired every chunk as its own request, so a slow one could arrive after the next and
 * corrupt the viewers' video. Here there is one request at a time; when the connection cannot keep
 * up (or the server lost the start of the recording) the uploader asks the recorder to start over
 * instead of skipping a piece, because viewers cannot play a stream with a hole in it.
 */

const FATAL_CODES = new Set(['NOT_LIVE', 'FORBIDDEN', 'NOT_FOUND', 'MODULE_FORBIDDEN'])

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * @param {object} options
 * @param {(blob: Blob, info: { header: boolean, signal: AbortSignal }) => Promise<void>} options.send
 * @param {(state: 'ok' | 'retrying' | 'lost') => void} options.onState
 * @param {(reason: 'backlog' | 'server' | 'network') => void} options.onRestartNeeded
 * @param {(error: Error) => void} options.onFatal  The server will not take video (not live, no permission).
 */
export function createChunkUploader({ send, onState, onRestartNeeded, onFatal, maxBacklog = 15, retries = 2 }) {
  let queue = []
  let running = false
  let stopped = false
  let state = 'ok'
  let abort = new AbortController()

  const setState = (next) => {
    if (state === next) return
    state = next
    onState(next)
  }

  function clear() {
    queue = []
    abort.abort()
    abort = new AbortController()
  }

  async function sendWithRetry(item) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        await send(item.blob, { header: item.header, signal: abort.signal })
        return
      } catch (error) {
        if (error?.name === 'AbortError') throw error
        const fatal = error.status === 401 || FATAL_CODES.has(error.code)
        if (fatal || error.code === 'STREAM_NEEDS_HEADER' || attempt >= retries) throw error
        setState('retrying')
        await sleep(400 * (attempt + 1))
      }
    }
  }

  async function drain() {
    if (running) return
    running = true
    try {
      while (queue.length > 0 && !stopped) {
        const item = queue[0]
        try {
          await sendWithRetry(item)
          queue.shift()
          setState('ok')
        } catch (error) {
          if (error?.name === 'AbortError') continue // reset() cleared the queue while this was in flight
          const fatal = error.status === 401 || FATAL_CODES.has(error.code)
          clear()
          if (fatal) {
            stopped = true
            onFatal(error)
          } else if (error.code === 'STREAM_NEEDS_HEADER') {
            onRestartNeeded('server')
          } else {
            setState('lost')
            onRestartNeeded('network')
          }
        }
      }
    } finally {
      running = false
    }
  }

  return {
    /** Queues a piece. `header` is the first piece of a recording and supersedes anything queued before it. */
    push(blob, { header = false } = {}) {
      if (stopped) return
      if (header) queue = []
      queue.push({ blob, header })
      if (queue.length > maxBacklog) {
        clear()
        setState('lost')
        onRestartNeeded('backlog')
        return
      }
      void drain()
    },
    /** Forget everything queued (the recorder is starting over). */
    reset() {
      clear()
    },
    stop() {
      stopped = true
      clear()
    },
  }
}
