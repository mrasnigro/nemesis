import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import CallStatusBand, { DialerTabBar } from '../components/CallStatusBand.jsx'
import {
  IconArrowLeft,
  IconClock,
  IconPhoneOff,
} from '../components/DialerIcons.jsx'
import LeadCompanyPanel from '../components/LeadCompanyPanel.jsx'
import ManualDialForm from '../components/ManualDialForm.jsx'
import ObjectionPanel from '../components/ObjectionPanel.jsx'
import QualificationForm from '../components/QualificationForm.jsx'
import SalesScript from '../components/SalesScript.jsx'
import DiscagemCallHistory from '../components/DiscagemCallHistory.jsx'
import EndCallModal from '../components/EndCallModal.jsx'
import ScheduleMeetingModal from '../components/ScheduleMeetingModal.jsx'
import { useBdrSession } from '../hooks/useBdrSession.js'
import '../../../pages/modules/Bdr.css'
import '../styles/bdr-foundation.css'

/**
 * Discagem workspace — parity with sample SDRDialer OUTHTML
 * (header → status band → tab card → Agendar / Desligar → session history)
 */
export default function BdrDiscagemPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'manual' ? 'manual' : 'automatic'
  const autoStartedRef = useRef(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [endCallOpen, setEndCallOpen] = useState(false)
  const [sessionHistory, setSessionHistory] = useState([])
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

  function openEndCall() {
    if (call.status === 'connected') {
      setEndCallOpen(true)
      return
    }
    hangupToIdle()
  }

  function closeManualModal() {
    navigate('/modules/bdr', { replace: true })
  }

  return (
    <section className="bdr-discagem">
      <header className="bdr-discagem__header">
        <div className="bdr-discagem__heading">
          <h1>Discagem Automática</h1>
          <p className="bdr-discagem__subtitle">
            Gerenciamento de leads frios e qualificação
          </p>
        </div>
        <Link to="/modules/bdr" className="bdr-page__back">
          <IconArrowLeft className="bdr-page__back-icon" />
          Voltar
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
        <div className="bdr-discagem__stack">
          <CallStatusBand />

          {connected ? (
            <div className="bdr-discagem__panel">
              <DialerTabBar />
              <div
                className={`bdr-discagem__panel-body${
                  activeTab === 'questions' ? ' bdr-discagem__panel-body--flush' : ''
                }`}
              >
                {activeTab === 'company' ? <LeadCompanyPanel /> : null}
                {activeTab === 'script' ? (
                  <SalesScript onRequestSchedule={openSchedule} />
                ) : null}
                {activeTab === 'questions' ? <ObjectionPanel /> : null}
                {activeTab === 'diagnosis' ? <QualificationForm /> : null}
                {scriptCompleted ? (
                  <p className="bdr-script__ok bdr-discagem__script-flag">
                    Script concluído — use Agendar Reunião ou Desligar abaixo.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="bdr-discagem__footer">
            <button
              type="button"
              className="bdr-discagem__schedule"
              disabled={!scheduleAllowed}
              aria-disabled={!scheduleAllowed}
              title={!scheduleAllowed ? 'Aguarde a conexão da chamada' : 'Agendar Reunião'}
              onClick={openSchedule}
            >
              <IconClock className="bdr-discagem__cta-icon" />
              Agendar Reunião
            </button>
            <button
              type="button"
              className="bdr-discagem__hangup"
              title="Desligar"
              onClick={openEndCall}
            >
              <IconPhoneOff className="bdr-discagem__cta-icon" />
              Desligar
            </button>
          </div>

          <DiscagemCallHistory rows={sessionHistory} />
        </div>
      ) : null}

      <ScheduleMeetingModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
      <EndCallModal
        open={endCallOpen}
        onClose={() => setEndCallOpen(false)}
        onFinalized={(row) => {
          setSessionHistory((prev) => [row, ...prev.filter((item) => item.id !== row.id)])
        }}
      />
    </section>
  )
}
