import { PAIN_ITEMS } from '../data/catalogs.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

/**
 * Bidirectional pain selection — same six IDs as live data-diagnosis-button set.
 */
export default function PainPointSelector({ title = 'Diagnóstico — Dores dos Empresários', variant = 'grid' }) {
  const { diagnosis, togglePain } = useBdrSession()
  const pains = diagnosis.pains || {}

  return (
    <div className={`bdr-pains bdr-pains--${variant}`}>
      {title ? <h3 className="bdr-script__h">{title}</h3> : null}
      <p className="bdr-script__hint">Dores dos Empresários</p>
      <div className="bdr-pains__grid">
        {PAIN_ITEMS.map((item) => {
          const selected = Boolean(pains[item.id])
          return (
            <button
              key={item.id}
              type="button"
              className={`bdr-pain-btn${selected ? ' is-selected' : ''}`}
              data-diagnosis-button={item.id}
              data-selected={String(selected)}
              aria-pressed={selected}
              style={{
                backgroundColor: selected ? item.color : '#64748B',
                boxShadow: selected
                  ? '0 0 0 2px rgba(248, 250, 252, 0.35), 0 4px 12px rgba(15, 23, 42, 0.45)'
                  : '0 2px 8px rgba(15, 23, 42, 0.35)',
              }}
              onClick={() => togglePain(item.id)}
            >
              {item.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
