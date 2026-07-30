import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import CallStatusBand, { DialerTabBar } from '../components/CallStatusBand.jsx'
import LeadCompanyPanel from '../components/LeadCompanyPanel.jsx'
import ManualDialForm from '../components/ManualDialForm.jsx'
import ObjectionPanel from '../components/ObjectionPanel.jsx'
import QualificationForm from '../components/QualificationForm.jsx'
import SalesScript from '../components/SalesScript.jsx'
import ScheduleMeetingModal from '../components/ScheduleMeetingModal.jsx'
import { useBdrSession } from '../hooks/useBdrSession.js'
import '../../../pages/modules/Bdr.css'
import '../styles/bdr-foundation.css'

/**
 * Discagem workspace — parity with sample SDRDialer
 * (status band → tab panel → Agendar / Desligar)
 * Manual mode opens Ligação Manual as a centered modal overlay.
 */
export default function BdrDiscagemPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'manual' ? 'manual' : 'automatic'
  const autoStartedRef = useRef(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const {
    call,
    dialAllowed,
    scheduleAllowed,
    startAutomatic,
    hangupToIdle,
    activeTab,
    scriptCompleted,
  } = useBdrSession()

  useEffect(() => {
    autoStartedRef.current = false
  }, [mode])

  useEffect(() => {
    if (mode !== 'automatic') return
    if (!dialAllowed || call.status !== 'idle') return
    if (autoStartedRef.current) return
    autoStartedRef.current = true
    startAutomatic()
  }, [mode, dialAllowed, call.status, startAutomatic])

  const showManualModal = mode === 'manual' && call.status === 'idle'
  const inCall = call.status === 'searching' || call.status === 'connected'
  const connected = call.status === 'connected'
  const openSchedule = () => setScheduleOpen(true)

  function closeManualModal() {
    navigate('/modules/bdr', { replace: true })
  }

  return (
    <section className="bdr-section bdr-discagem">
      <header className="bdr-discagem__header">
        <p className="bdr-discagem__subtitle">Gerenciamento de leads frios e qualificação</p>
        <Link to="/modules/bdr" className="bdr-page__back">
          ← Voltar
        </Link>
      </header>

      {!dialAllowed && call.status === 'idle' && mode !== 'manual' ? (
        <article className="bdr-section__card">
          <p>
            Defina o status <strong>Em atendimento</strong> no painel para iniciar a discagem.
          </p>
          <Link to="/modules/bdr" className="bdr-section__cta">
            Ir ao painel
          </Link>
        </article>
      ) : null}

      <ManualDialForm open={showManualModal} onClose={closeManualModal} />

      {inCall ? (
        <>
          <CallStatusBand />

          {connected ? (
            <div className="bdr-discagem__panel">
              <DialerTabBar />

              {activeTab === 'company' ? <LeadCompanyPanel /> : null}
              {activeTab === 'script' ? <SalesScript onRequestSchedule={openSchedule} /> : null}
              {activeTab === 'questions' ? <ObjectionPanel /> : null}
              {activeTab === 'diagnosis' ? (
                <QualificationForm onRequestSchedule={openSchedule} />
              ) : null}

              {scriptCompleted ? (
                <p className="bdr-script__ok bdr-discagem__script-flag">
                  Script concluído — use Agendar Reunião e Finalizar Atendimento na aba de
                  diagnóstico.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="bdr-discagem__footer">
            <button
              type="button"
              className="bdr-discagem__schedule"
              disabled={!scheduleAllowed}
              title={!scheduleAllowed ? 'Aguarde a conexão da chamada' : 'Agendar Reunião'}
              onClick={openSchedule}
            >
              Agendar Reunião
            </button>
            <button type="button" className="bdr-discagem__hangup" onClick={hangupToIdle}>
              Desligar
            </button>
          </div>
        </>
      ) : null}

      <ScheduleMeetingModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </section>
  )
}
