import { useEffect, useRef, useState } from 'react'
import { thermometerLabel } from '../data/catalogs.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

function thermoBandClass(label) {
  if (label === 'Frio') return 'bdr-endcall-modal__thermo--frio'
  if (label === 'Morno') return 'bdr-endcall-modal__thermo--morno'
  return 'bdr-endcall-modal__thermo--quente'
}

/**
 * Encerramento de Ligação — Desligar overlay (sample SDRDialer endCallModal).
 * Collects deep diagnosis notes, conversation perception, and sales thermometer.
 */
export default function EndCallModal({ open = false, onClose, onFinalized }) {
  const {
    diagnosis,
    salesTemperature,
    setSalesTemperature,
    patchDiagnosis,
    finalizeAttendance,
    hangupToIdle,
    call,
    dispositionId,
  } = useBdrSession()

  const [painPoints, setPainPoints] = useState('')
  const [needs, setNeeds] = useState('')
  const [extraObservations, setExtraObservations] = useState('')
  const [conversationSummary, setConversationSummary] = useState('')
  const [temperature, setTemperature] = useState(50)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const d = diagnosis || {}
      setPainPoints(d.painPoints || '')
      setNeeds(d.needs || '')
      setExtraObservations(d.extraObservations || '')
      setConversationSummary(d.conversationSummary || '')
      setTemperature(salesTemperature ?? 50)
      setError('')
      setSubmitting(false)
    }
    wasOpenRef.current = open
  }, [open, diagnosis, salesTemperature])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const label = thermometerLabel(temperature)

  async function handleFinalize() {
    if (submitting) return
    setSubmitting(true)
    setError('')

    const nextDiagnosis = {
      ...(diagnosis || {}),
      painPoints,
      needs,
      extraObservations,
      conversationSummary,
    }

    patchDiagnosis({
      painPoints,
      needs,
      extraObservations,
      conversationSummary,
    })
    setSalesTemperature(temperature)

    if (call?.status !== 'connected') {
      hangupToIdle()
      onClose?.()
      return
    }

    const result = await finalizeAttendance({
      dispositionId: dispositionId || 'no_contact',
      salesTemperature: temperature,
      diagnosis: nextDiagnosis,
    })

    if (!result?.ok) {
      setError(result?.error || 'Não foi possível finalizar o atendimento.')
      setSubmitting(false)
      return
    }

    if (result.row) onFinalized?.(result.row)
    onClose?.()
  }

  return (
    <div
      id="endCallModal"
      className="bdr-endcall-modal"
      role="presentation"
    >
      <div
        id="endCallModalContent"
        className="bdr-endcall-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bdr-endcall-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="bdr-endcall-title" className="bdr-endcall-modal__title">
          Encerramento de Ligação
        </h2>

        <div className="bdr-endcall-modal__sections">
          <section className="bdr-endcall-modal__section">
            <h3 className="bdr-endcall-modal__section-title bdr-endcall-modal__section-title--tight">
              Diagnóstico Profundo
            </h3>
            <div className="bdr-endcall-modal__fields">
              <div className="bdr-endcall-modal__field">
                <label className="bdr-endcall-modal__label" htmlFor="bdr-endcall-pain">
                  REGISTRO DE PROBLEMAS E GARGALOS
                </label>
                <textarea
                  id="bdr-endcall-pain"
                  className="bdr-endcall-modal__textarea"
                  value={painPoints}
                  onChange={(e) => setPainPoints(e.target.value)}
                  placeholder="Quais os principais problemas e gargalos que ele relatou?"
                  rows={3}
                />
              </div>
              <div className="bdr-endcall-modal__field">
                <label className="bdr-endcall-modal__label" htmlFor="bdr-endcall-needs">
                  REGISTRO DE NECESSIDADES
                </label>
                <textarea
                  id="bdr-endcall-needs"
                  className="bdr-endcall-modal__textarea"
                  value={needs}
                  onChange={(e) => setNeeds(e.target.value)}
                  placeholder="O que ele diz que precisa para resolver os problemas ou atingir a meta?"
                  rows={3}
                />
              </div>
            </div>
          </section>

          <section className="bdr-endcall-modal__section">
            <h3 className="bdr-endcall-modal__section-title">Percepção da conversa</h3>
            <div className="bdr-endcall-modal__fields">
              <div className="bdr-endcall-modal__field">
                <label className="bdr-endcall-modal__label" htmlFor="bdr-endcall-extra">
                  OBSERVAÇÕES EXTRAS E LIVRES
                </label>
                <textarea
                  id="bdr-endcall-extra"
                  className="bdr-endcall-modal__textarea"
                  value={extraObservations}
                  onChange={(e) => setExtraObservations(e.target.value)}
                  placeholder="Detalhes técnicos, informações do processo comercial ou curiosidades da operação..."
                  rows={3}
                />
              </div>
              <div className="bdr-endcall-modal__field">
                <label className="bdr-endcall-modal__label" htmlFor="bdr-endcall-summary">
                  RESUMO DA CONVERSA E SENTIMENTO (FEELING DO LEAD)
                </label>
                <textarea
                  id="bdr-endcall-summary"
                  className="bdr-endcall-modal__textarea"
                  value={conversationSummary}
                  onChange={(e) => setConversationSummary(e.target.value)}
                  placeholder="Como ele se comportou na ligação? Interessado? Frio? Ansioso? Qual o seu resumo geral do atendimento para o Closer?"
                  rows={3}
                />
              </div>
            </div>
          </section>
        </div>

        <div
          id="salesThermometer"
          className={`bdr-endcall-modal__thermo ${thermoBandClass(label)}`}
        >
          <div className="bdr-endcall-modal__thermo-header">
            <label htmlFor="salesTemperature">TERMÔMETRO DE VENDA</label>
            <span>
              {temperature}% · {label}
            </span>
          </div>
          <input
            id="salesTemperature"
            className="bdr-endcall-modal__thermo-range"
            type="range"
            min={0}
            max={100}
            step={1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            aria-label="Grau de aderência do cliente"
            aria-valuetext={`${temperature}% ${label}`}
          />
          <div className="bdr-endcall-modal__thermo-scale">
            <span>BAIXA</span>
            <span>ALTA</span>
          </div>
        </div>

        {error ? <p className="bdr-endcall-modal__error">{error}</p> : null}

        <div className="bdr-endcall-modal__actions">
          <button
            type="button"
            className="bdr-endcall-modal__submit"
            disabled={submitting}
            onClick={handleFinalize}
          >
            Finalizar Atendimento
          </button>
        </div>
      </div>
    </div>
  )
}
