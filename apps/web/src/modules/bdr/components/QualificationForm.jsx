import {
  COMPANY_SIZE_OPTIONS,
  EMPLOYEE_OPTIONS,
  PARTNER_OPTIONS,
  PRIORITY_OPTIONS,
  REVENUE_OPTIONS,
} from '../data/scriptContent'
import { useBdrSession } from '../hooks/useBdrSession.js'
import PainPointSelector from './PainPointSelector'

function Field({ id, label, value, onChange, options, className = '' }) {
  return (
    <div className={className}>
      <label className="bdr-qualification__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="bdr-qualification__select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * Anotações de Diagnóstico — Qualificação + Dores + Registro de Objeções (live Dialer).
 * Schedule / hangup live in the page footer outside this panel.
 */
export default function QualificationForm() {
  const { diagnosis, patchDiagnosis, patchDiagnosisField, togglePain, call } = useBdrSession()
  const d = diagnosis || {}
  const disabled = call?.status !== 'connected'
  const selectedPains = Object.entries(d.pains || {})
    .filter(([, on]) => on)
    .map(([id]) => id)

  return (
    <fieldset className={`bdr-qualification${disabled ? ' is-disabled' : ''}`} disabled={disabled}>
      <div className="bdr-qualification__block">
        <h3 className="bdr-qualification__heading">Qualificação do Negócio</h3>
        <div className="bdr-qualification__grid">
          <Field
            id="bdr-company-size"
            label="PORTE DA EMPRESA"
            value={d.companySize}
            onChange={(v) => patchDiagnosisField('companySize', v)}
            options={COMPANY_SIZE_OPTIONS}
          />
          <Field
            id="bdr-revenue"
            label="FATURAMENTO MENSAL ESTIMADO"
            value={d.monthlyRevenue}
            onChange={(v) => patchDiagnosisField('monthlyRevenue', v)}
            options={REVENUE_OPTIONS}
          />
          <Field
            id="bdr-employees"
            label="Nº DE COLABORADORES"
            value={d.employees}
            onChange={(v) => patchDiagnosisField('employees', v)}
            options={EMPLOYEE_OPTIONS}
          />
          <Field
            id="bdr-priority"
            label="PRIORIDADE NO MOMENTO?"
            value={d.priority}
            onChange={(v) => patchDiagnosisField('priority', v)}
            options={PRIORITY_OPTIONS}
          />
          <Field
            id="bdr-partner"
            label="NECESSÁRIA PRESENÇA DO(S) SÓCIO(S)?"
            value={d.partnerPresence}
            onChange={(v) => patchDiagnosisField('partnerPresence', v)}
            options={PARTNER_OPTIONS}
            className="bdr-qualification__field--start"
          />
        </div>
      </div>

      <div className="bdr-qualification__block">
        <PainPointSelector selected={selectedPains} onToggle={togglePain} />
      </div>

      <div className="bdr-qualification__block">
        <label className="bdr-qualification__label" htmlFor="bdr-objections-log">
          REGISTRO DE OBJEÇÕES
        </label>
        <textarea
          id="bdr-objections-log"
          className="bdr-qualification__textarea"
          rows={4}
          value={d.objections || ''}
          onChange={(e) => patchDiagnosis({ objections: e.target.value })}
          placeholder="Levantou alguma objeção preliminar? Ex: 'Achei caro', 'Sem tempo', 'Já uso um software'..."
        />
      </div>
    </fieldset>
  )
}
