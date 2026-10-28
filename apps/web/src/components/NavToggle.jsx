import { useEffect, useState } from 'react'
import './NavToggle.css'

export function useCompactNav(query = '(max-width: 900px)') {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return compact
}

export default function NavToggle({ open = false, controls, onClick, className = '' }) {
  return (
    <button
      type="button"
      className={['nav-toggle', className].filter(Boolean).join(' ')}
      aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      aria-expanded={open}
      aria-controls={controls}
      onClick={onClick}
    >
      <span className="nav-toggle__bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </button>
  )
}
