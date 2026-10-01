import { OPERATOR_STATUSES } from '../data/catalogs.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

function StatusGlyph({ id }) {
  if (id === 'intervalo') {
    return (
      <span className="bdr-home__status-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path fill="currentColor" d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
        </svg>
      </span>
    )
  }
  if (id === 'indisponivel') {
    return (
      <span className="bdr-home__status-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M13 3h-2v9h2V3zm-1 18c-4.41 0-8-3.59-8-8 0-2.52 1.17-4.77 3-6.24v2.44A5.99 5.99 0 0 0 6 13c0 3.31 2.69 6 6 6s6-2.69 6-6c0-1.54-.58-2.95-1.54-4.02V6.76A7.96 7.96 0 0 1 20 13c0 4.41-3.59 8-8 8z"
          />
        </svg>
      </span>
    )
  }
  return <span className="bdr-home__status-dot" aria-hidden="true" />
}

export default function OperatorStatusBar() {
  const { operatorStatus, setOperatorStatus, canTransitionOperator, getStatusButtonTitle } =
    useBdrSession()

  return (
    <div className="bdr-home__statuses" role="group" aria-label="Status do operador">
      {OPERATOR_STATUSES.map((item) => {
        const active = operatorStatus === item.id
        const allowed = canTransitionOperator(item.id)
        const disabled = !active && !allowed
        const toneClass =
          item.id === 'desconectado'
            ? 'bdr-home__status--offline'
            : item.id === 'atendimento'
              ? 'bdr-home__status--active'
              : item.id === 'intervalo'
                ? 'bdr-home__status--break'
                : 'bdr-home__status--busy'

        return (
          <button
            key={item.id}
            type="button"
            className={`bdr-home__status${active ? ` ${toneClass}` : ''}`}
            title={getStatusButtonTitle(item.id)}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => setOperatorStatus(item.id)}
          >
            <StatusGlyph id={item.id} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
