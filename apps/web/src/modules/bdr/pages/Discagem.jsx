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
import DialAttemptsLog from '../components/DialAttemptsLog.jsx'
import EndCallModal from '../components/EndCallModal.jsx'
import ScheduleMeetingModal from '../components/ScheduleMeetingModal.jsx'
import { useBdrSession } from '../hooks/useBdrSession.js'
import '../styles/bdr-pages.css'
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
    hangupLine,
    markNotHuman,
    disconnectSession,
    activeTab,
    scriptCompleted,
    dialError,
    clearDialError,
    recentAttempts,
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

  const canMarkVoicemail = connected && Boolean(call.attempt?.id)

  function openEndCall() {
    if (call.status === 'connected') {
      hangupLine()
      setEndCallOpen(true)
      return
    }
    hangupToIdle()
  }

  function retryDial() {
    clearDialError()
    startAutomatic()
  }

  function handleVoltar() {
    disconnectSession()
    navigate('/modules/bdr')
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
        <button type="button" className="bdr-page__back" onClick={handleVoltar}>
          <IconArrowLeft className="bdr-page__back-icon" />
          Voltar
        </button>
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

      {dialError && call.status === 'idle' ? (
        <article className="bdr-section__card bdr-discagem__dial-error" role="alert">
          <p>{dialError.message}</p>
          {dialError.code === 'NO_EXTENSION' || dialError.code === 'TELEPHONY_NOT_CONFIGURED' ? (
            <Link to="/modules/bdr" className="bdr-section__cta">
              Configurar no painel
            </Link>
          ) : mode === 'manual' ? (
            <button type="button" className="bdr-section__cta" onClick={clearDialError}>
              Nova ligação manual
            </button>
          ) : dialAllowed ? (
            <button type="button" className="bdr-section__cta" onClick={retryDial}>
              Tentar novamente
            </button>
          ) : null}
        </article>
      ) : null}

      <ManualDialForm open={showManualModal && !dialError} onClose={closeManualModal} />

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
            {canMarkVoicemail ? (
              <button
                type="button"
                className="bdr-discagem__schedule"
                title="Atendeu uma caixa postal: registra a tentativa e segue para o próximo lead"
                onClick={() => void markNotHuman('voicemail')}
              >
                Caixa postal
              </button>
            ) : null}
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

      <DialAttemptsLog rows={recentAttempts} />

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
