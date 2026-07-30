import { OPERATOR_STATUSES } from '../data/catalogs.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

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
            <span className="bdr-home__status-dot" aria-hidden="true" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
