import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import WebinarSessionGate from '../components/WebinarSessionGate.jsx'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'
import { launchOneOnOneFromMeeting } from '../services/oneOnOneLaunch.js'

/**
 * M4 entry: BDR agenda → ensure Webinar session → create/open 1:1 room detail.
 * Expects `location.state.meeting` from MeetingCard.
 */
export default function WebinarOneOnOneLaunchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { apiRequest, isReady, status, ensureSession } = useWebinarSession()
  const meeting = location.state?.meeting || null
  const [error, setError] = useState('')
  const [phase, setPhase] = useState('preparing')
  const startedRef = useRef(false)

  useEffect(() => {
    if (status === 'idle' || status === 'error') void ensureSession()
  }, [ensureSession, status])

  useEffect(() => {
    if (!meeting) {
      setError('Nenhum agendamento BDR foi passado. Volte aos Agendamentos.')
      setPhase('error')
      return
    }
    if (!isReady || startedRef.current) return

    startedRef.current = true
    setPhase('launching')
    setError('')

    ;(async () => {
      try {
        const result = await launchOneOnOneFromMeeting({ apiRequest, meeting })
        // Persist link for return visits (BDR listenermay pick this from history state via replace later)
        try {
          sessionStorage.setItem(
            `imp_bdr_webinar_${meeting.id}`,
            JSON.stringify({
              webinarId: result.webinarId,
              meetingId: meeting.id,
              at: new Date().toISOString(),
            }),
          )
        } catch {
          /* ignore */
        }
        navigate(result.path, {
          replace: true,
          state: {
            fromBdr: true,
            meetingId: meeting.id,
            webinarCreated: result.created,
            returnTo: '/modules/bdr/agendamentos',
          },
        })
      } catch (err) {
        setPhase('error')
        setError(err instanceof Error ? err.message : 'Falha ao abrir reunião 1:1')
        startedRef.current = false
      }
    })()
  }, [apiRequest, isReady, meeting, navigate])

  return (
    <WebinarSessionGate>
      <section className="imp-module webinar-page">
        <header className="webinar-page__intro">
          <div>
            <h2>Reunião 1:1</h2>
            <p>
              {meeting
                ? `${meeting.leadName || 'Lead'} · ${meeting.company || 'Empresa'}`
                : 'Preparando bridge BDR → Webinar'}
            </p>
          </div>
        </header>

        <div className="imp-panel">
          {phase === 'preparing' || phase === 'launching' ? (
            <p className="webinar-launcher__note">
              {phase === 'preparing'
                ? 'Aguardando sessão Webinar…'
                : 'Criando / abrindo sala da reunião…'}
            </p>
          ) : null}
          {error ? (
            <>
              <p className="webinar-launcher__error" role="alert">
                {error}
              </p>
              <div className="webinar-launcher__actions">
                <Link to="/modules/bdr/agendamentos" className="imp-btn imp-btn--primary">
                  Voltar aos agendamentos
                </Link>
                <button
                  type="button"
                  className="imp-btn imp-btn--ghost"
                  onClick={() => {
                    startedRef.current = false
                    setPhase('preparing')
                    setError('')
                    void ensureSession({ force: true })
                  }}
                >
                  Tentar de novo
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </WebinarSessionGate>
  )
}
