import { Link, useSearchParams } from 'react-router-dom'
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
 * Discagem workspace — searching/connected + full script / objections / diagnosis.
 */
export default function BdrDiscagemPage() {
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

  const showManualForm = mode === 'manual' && call.status === 'idle'
  const inCall = call.status === 'searching' || call.status === 'connected'
  const openSchedule = () => setScheduleOpen(true)

  return (
    <section className="bdr-section bdr-discagem">
      <header className="bdr-discagem__header">
        <div>
          <h2>Discagem Automática</h2>
          <p>Gerenciamento de leads frios e qualificação</p>
        </div>
        <Link to="/modules/bdr" className="bdr-page__back">
          ← Voltar
        </Link>
      </header>

      {!dialAllowed && call.status === 'idle' ? (
        <article className="bdr-section__card">
          <p>
            Defina o status <strong>Em atendimento</strong> no painel para iniciar a discagem.
          </p>
          <Link to="/modules/bdr" className="bdr-section__cta">
            Ir ao painel
          </Link>
        </article>
      ) : null}

      {showManualForm ? <ManualDialForm /> : null}

      {inCall ? (
        <article className="bdr-section__card bdr-discagem__workspace">
          <CallStatusBand />
          <DialerTabBar />

          {call.status === 'connected' && activeTab === 'company' ? <LeadCompanyPanel /> : null}
          {call.status === 'connected' && activeTab === 'script' ? (
            <SalesScript onRequestSchedule={openSchedule} />
          ) : null}
          {call.status === 'connected' && activeTab === 'questions' ? <ObjectionPanel /> : null}
          {call.status === 'connected' && activeTab === 'diagnosis' ? (
            <QualificationForm onRequestSchedule={openSchedule} />
          ) : null}

          {call.status === 'searching' ? (
            <p className="bdr-foundation-placeholder">
              O sistema procura automaticamente por números para ligar…
            </p>
          ) : null}

          {call.status === 'connected' && scriptCompleted ? (
            <p className="bdr-script__ok bdr-discagem__script-flag">
              Script concluído — use Agendar Reunião e Finalizar Atendimento na aba de diagnóstico.
            </p>
          ) : null}

          <div className="bdr-discagem__footer">
            <button
              type="button"
              className="bdr-discagem__schedule"
              disabled={!scheduleAllowed}
              title={!scheduleAllowed ? 'Aguarde a conexão da chamada' : undefined}
              onClick={openSchedule}
            >
              Agendar Reunião
            </button>
            <button type="button" className="bdr-discagem__hangup" onClick={hangupToIdle}>
              Desligar
            </button>
          </div>
        </article>
      ) : null}

      <ScheduleMeetingModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </section>
  )
}
