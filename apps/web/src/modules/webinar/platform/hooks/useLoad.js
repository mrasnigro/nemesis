import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs `load` on mount and whenever `deps` change; the latest call wins and a stale answer is dropped.
 * `reload()` runs it again without clearing what is on screen.
 */
export function useLoad(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const run = useRef(0)
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  })

  const reload = useCallback(async () => {
    const ticket = ++run.current
    try {
      const data = await loadRef.current()
      if (ticket === run.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (ticket === run.current) setState((prev) => ({ data: prev.data, error, loading: false }))
    }
  }, [])

  useEffect(() => {
    reload()
    return () => {
      run.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload }
}

/** Calls `tick` every `ms` while the tab is visible. Stops when the component unmounts. */
export function usePolling(tick, ms, enabled = true) {
  const tickRef = useRef(tick)

  useEffect(() => {
    tickRef.current = tick
  })

  useEffect(() => {
    if (!enabled) return undefined
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') tickRef.current()
    }, ms)
    return () => clearInterval(id)
  }, [ms, enabled])
}
