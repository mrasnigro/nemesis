import { useState } from 'react'
import {
  COMPANY_SIZE_OPTIONS,
  EMPLOYEE_OPTIONS,
  PARTNER_OPTIONS,
  PRIORITY_OPTIONS,
  REVENUE_OPTIONS,
} from '../data/scriptContent.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import DispositionSelector from './DispositionSelector.jsx'
import PainPointSelector from './PainPointSelector.jsx'
import ThermometerControl from './ThermometerControl.jsx'

/**
 * Anotações de Diagnóstico — qualification selects + deep notes + wrap-up.
 */
export default function QualificationForm({ onRequestSchedule }) {
  const {
    diagnosis,
    notes,
    setNotes,
    patchDiagnosisField,
    finalizeAttendance,
    dispositionId,
    scriptCompleted,
    call,
  } = useBdrSession()

  const [finalizeError, setFinalizeError] = useState('')
  const [finalizing, setFinalizing] = useState(false)

  const onSelect = (field) => (e) => {
    patchDiagnosisField(field, e.target.value)
  }

  const onText = (field) => (e) => {
    patchDiagnosisField(field, e.target.value)
  }

  const handleFinalize = async () => {
    setFinalizeError('')
    setFinalizing(true)
    const result = await finalizeAttendance()
    setFinalizing(false)
    if (!result.ok) {
      setFinalizeError(result.error || 'Não foi possível finalizar.')
    }
  }

  return (
    <div className="bdr-qualification">
      <section className="bdr-qualification__block">
        <h3>Qualificação do Negócio</h3>
        <div className="bdr-qualification__grid">
          <label>
            Porte da empresa
            <select value={diagnosis.companySize || ''} onChange={onSelect('companySize')}>
              <option value="">Selecione...</option>
              {COMPANY_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Faturamento mensal estimado
            <select value={diagnosis.monthlyRevenue || ''} onChange={onSelect('monthlyRevenue')}>
              <option value="">Selecione...</option>
              {REVENUE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nº de colaboradores
            <select value={diagnosis.employees || ''} onChange={onSelect('employees')}>
              <option value="">Selecione...</option>
              {EMPLOYEE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridade no momento?
            <select value={diagnosis.priority || ''} onChange={onSelect('priority')}>
              <option value="">Selecione...</option>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Necessária presença do(s) sócio(s)?
            <select value={diagnosis.partnerPresence || ''} onChange={onSelect('partnerPresence')}>
              <option value="">Selecione...</option>
              {PARTNER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {diagnosis.partnerPresence === 'nao' ? (
          <p className="bdr-script__callout">
            Soft rule: o interlocutor não é o único decisor — busque o real tomador de decisão
            antes do compromisso comercial.
          </p>
        ) : null}
      </section>

      <PainPointSelector />

      <section className="bdr-qualification__block">
        <h3>Diagnóstico profundo</h3>
        <label>
          Problemas / gargalos (dores)
          <textarea
            rows={3}
            value={diagnosis.painPoints || ''}
            onChange={onText('painPoints')}
            placeholder="Sincronizado com as dores selecionadas; edite livremente."
          />
        </label>
        <label>
          Necessidades
          <textarea rows={3} value={diagnosis.needs || ''} onChange={onText('needs')} />
        </label>
        <label>
          Registro de objeções
          <textarea
            rows={3}
            value={diagnosis.objections || ''}
            onChange={onText('objections')}
            placeholder="Objeções levantadas na conversa…"
          />
        </label>
        <label>
          Observações extras
          <textarea
            rows={2}
            value={diagnosis.extraObservations || ''}
            onChange={onText('extraObservations')}
          />
        </label>
        <label>
          Resumo / feeling do lead (handoff Closer)
          <textarea
            rows={3}
            value={diagnosis.conversationSummary || ''}
            onChange={onText('conversationSummary')}
          />
        </label>
        <label>
          Notas gerais da chamada
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </section>

      <ThermometerControl />
      <DispositionSelector />

      <div className="bdr-qualification__actions">
        {scriptCompleted ? (
          <p className="bdr-script__ok">Script concluído — agendamento e finalização liberados.</p>
        ) : (
          <p className="bdr-script__hint">
            Complete o Script de Abordagem (abertura, dores, decisão, equipe e faturamento) para
            marcar o fluxo como concluído.
          </p>
        )}
        <button
          type="button"
          className="bdr-discagem__schedule"
          disabled={call.status !== 'connected'}
          title={call.status !== 'connected' ? 'Aguarde a conexão da chamada' : undefined}
          onClick={onRequestSchedule}
        >
          Agendar Reunião
        </button>
        <button
          type="button"
          className="bdr-qualification__finalize"
          disabled={finalizing || call.status !== 'connected'}
          onClick={handleFinalize}
        >
          {finalizing ? 'Finalizando…' : 'Finalizar Atendimento'}
        </button>
        {!dispositionId ? (
          <p className="bdr-manual-form__error">
            Selecione uma qualificação (disposição) para finalizar.
          </p>
        ) : null}
        {finalizeError ? <p className="bdr-manual-form__error">{finalizeError}</p> : null}
      </div>
    </div>
  )
}
