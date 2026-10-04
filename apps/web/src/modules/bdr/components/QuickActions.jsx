import { useNavigate } from 'react-router-dom'
import { useBdrPermissions } from '../hooks/useBdrPermissions.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import { IconPhoneOff } from './DialerIcons.jsx'

function ActionIcon({ name }) {
  const icons = {
    phone: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V21c0 .6-.4 1-1 1C10.6 22 2 13.4 2 2.9 2 2.4 2.4 2 3 2h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
        />
      </svg>
    ),
    phoneOff: <IconPhoneOff />,
    history: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13 3a9 9 0 1 0 8.94 8H19a7 7 0 1 1-2.05-4.95L14 9h7V2l-2.65 2.65A8.96 8.96 0 0 0 13 3zm-1 5v5l4.25 2.52.75-1.23-3.5-2.04V8H12z"
        />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2zm12 8H5v9h14v-9zM5 8h14V6H5v2z"
        />
      </svg>
    ),
  }

  return <span className="bdr-home__action-icon">{icons[name]}</span>
}

export default function QuickActions() {
  const navigate = useNavigate()
  const { dialAllowed, call, resumeDialing } = useBdrSession()
  const { canOperate, canViewHistory, canSchedule } = useBdrPermissions()

  const dialEnabled = dialAllowed && canOperate

  /** One click: puts the operator Em atendimento and starts going through the list. */
  function startAttendance() {
    if (!canOperate) return
    if (call.status === 'idle') resumeDialing()
    navigate('/modules/bdr/discagem?mode=automatic')
  }

  function goManual() {
    if (!dialEnabled) return
    navigate('/modules/bdr/discagem?mode=manual')
  }

  return (
    <aside className="bdr-home__panel bdr-home__panel--actions">
      <header>
        <h2>Ações Rápidas</h2>
      </header>

      <div className="bdr-home__actions">
        <button
          type="button"
          className="bdr-home__action--primary"
          disabled={!canOperate}
          title="Fica Em atendimento e liga para os contatos da campanha, um após o outro"
          onClick={startAttendance}
        >
          <ActionIcon name="phone" />
          <span>Iniciar atendimento</span>
        </button>

        <button
          type="button"
          disabled={!dialEnabled}
          title={
            dialEnabled ? 'Ligação Manual' : 'Disponível apenas com status Em atendimento'
          }
          onClick={goManual}
        >
          <ActionIcon name="phoneOff" />
          <span>Ligação Manual</span>
        </button>

        <button
          type="button"
          disabled={!canViewHistory}
          onClick={() => navigate('/modules/bdr/historico')}
        >
          <ActionIcon name="history" />
          <span>Ver Histórico de Chamadas</span>
        </button>

        <button
          type="button"
          disabled={!canSchedule}
          onClick={() => navigate('/modules/bdr/agendamentos')}
        >
          <ActionIcon name="calendar" />
          <span>Agendamentos Realizados</span>
        </button>
      </div>
    </aside>
  )
}
