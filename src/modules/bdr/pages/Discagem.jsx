import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import CallStatusBand, { DialerTabBar } from '../components/CallStatusBand.jsx'
import LeadCompanyPanel from '../components/LeadCompanyPanel.jsx'
import ManualDialForm from '../components/ManualDialForm.jsx'
import { useBdrSession } from '../hooks/useBdrSession.js'
import '../../../pages/modules/Bdr.css'
import '../styles/bdr-foundation.css'

/**
 * Foundation discagem workspace.
 * Full script / objections / diagnosis finalize UI land in later phases;
 * session machines + searching/connected loop are live here.
 */
export default function BdrDiscagemPage() {
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'manual' ? 'manual' : 'automatic'
  const autoStartedRef = useRef(false)
  const {
    call,
    dialAllowed,
    scheduleAllowed,
    startAutomatic,
    hangupToIdle,
    activeTab,
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
            <p className="bdr-foundation-placeholder">
              Script de Abordagem — conteúdo completo na próxima fase (máquina e aba já
              preparados).
            </p>
          ) : null}
          {call.status === 'connected' && activeTab === 'questions' ? (
            <p className="bdr-foundation-placeholder">
              Questionamentos Padrão — categorias seed disponíveis em data/; UI na próxima fase.
            </p>
          ) : null}
          {call.status === 'connected' && activeTab === 'diagnosis' ? (
            <p className="bdr-foundation-placeholder">
              Anotações de Diagnóstico / termômetro / disposição — estado já no BdrSession;
              formulário na próxima fase.
            </p>
          ) : null}

          {call.status === 'searching' ? (
            <p className="bdr-foundation-placeholder">
              O sistema procura automaticamente por números para ligar…
            </p>
          ) : null}

          <div className="bdr-discagem__footer">
            <button type="button" className="bdr-discagem__schedule" disabled={!scheduleAllowed}>
              Agendar Reunião
            </button>
            <button type="button" className="bdr-discagem__hangup" onClick={hangupToIdle}>
              Desligar
            </button>
          </div>
        </article>
      ) : null}
    </section>
  )
}
