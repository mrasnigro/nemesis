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
            d="M13 3h-2v10h2V3zm-1 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
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
