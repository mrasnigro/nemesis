import { PAIN_ITEMS } from '../data/catalogs'

/**
 * “Diagnóstico / Dores dos Empresários” — 2×3 grid matching live Dialer.
 * Selected chips use catalog brand colors; idle = slate-500.
 */
export default function PainPointSelector({ selected = [], onToggle }) {
  return (
    <div className="bdr-pains">
      <h3 className="bdr-pains__title">Diagnóstico</h3>
      <div className="bdr-pains__subtitle">Dores dos Empresários</div>
      <div className="bdr-pains__grid" role="group" aria-label="Dores dos empresários">
        {PAIN_ITEMS.map((pain) => {
          const active = selected.includes(pain.id)
          return (
            <button
              key={pain.id}
              type="button"
              className={`bdr-pain-btn${active ? ' is-selected' : ''}`}
              style={
                active
                  ? { backgroundColor: pain.color, borderColor: pain.color }
                  : { backgroundColor: '#64748b', borderColor: '#cbd5e1' }
              }
              aria-pressed={active}
              onClick={() => onToggle?.(pain.id)}
            >
              {pain.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
