import { formatDurationHHMMSS } from '../services/formatters.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import './AttendanceTimer.css'

/**
 * Header chip showing elapsed attendance time ("Tempo em atendimento").
 * Paused when the session counter is at zero; live otherwise.
 */
export default function AttendanceTimer({
  seconds,
  paused: pausedProp,
  label = 'Tempo em atendimento',
  className = '',
}) {
  const session = useBdrSession()
  const valueSec = seconds ?? session.tempoAtendimentoSec
  const paused = pausedProp ?? !valueSec

  return (
    <div
      className={`attendance-timer${paused ? ' attendance-timer--paused' : ''}${
        className ? ` ${className}` : ''
      }`}
      title={paused ? 'Contador pausado' : label}
      role="timer"
      aria-label={`${label}: ${formatDurationHHMMSS(valueSec)}`}
      aria-live="polite"
    >
      <span
        className={`attendance-timer__dot${paused ? '' : ' attendance-timer__dot--live'}`}
        aria-hidden="true"
      />
      <div className="attendance-timer__copy">
        <p className="attendance-timer__label">{label}</p>
        <p className="attendance-timer__value">{formatDurationHHMMSS(valueSec)}</p>
      </div>
    </div>
  )
}
