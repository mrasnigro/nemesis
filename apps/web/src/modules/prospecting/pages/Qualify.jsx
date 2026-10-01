import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QUALIFICATION_CRITERIA } from '../data/seeds.js'
import { useProspecting } from '../context/ProspectingContext.jsx'

export default function ProspectQualifyPage() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const {
    results,
    selectCompany,
    selectedCompany,
    qualification,
    updateQualification,
    saveQualification,
    canQualify,
    sendToBdr,
    canSendBdr,
  } = useProspecting()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    selectCompany(companyId)
  }, [companyId, selectCompany])

  const company =
    selectedCompany || results.find((item) => item.id === companyId) || null

  if (!company) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Empresa não encontrada. <Link to="/modules/prospecting">Voltar</Link>
        </div>
      </section>
    )
  }

  function handleSave() {
    const ok = saveQualification()
    setSaved(Boolean(ok))
  }

  function handleSaveAndSend() {
    if (!saveQualification()) return
    const batch = sendToBdr([company.id])
    if (batch) navigate('/modules/prospecting/enviar-bdr')
  }

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to="/modules/prospecting" className="imp-btn imp-btn--ghost">
          ← Voltar à busca
        </Link>
      </div>

      {saved ? <div className="imp-toast">Prospect qualificado e pronto para envio ao BDR.</div> : null}

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>{company.name}</h2>
              <p>
                {company.segment} · {company.city} · {company.employees} colaboradores
              </p>
            </div>
            <span className="imp-pill imp-pill--amber">Score {company.score}</span>
          </div>

          <dl style={{ display: 'grid', gap: '0.75rem', margin: '0 0 1rem' }}>
            <div>
              <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Contato</dt>
              <dd style={{ margin: '0.2rem 0 0' }}>
                {company.contact.name} — {company.contact.role}
              </dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Telefone</dt>
              <dd style={{ margin: '0.2rem 0 0' }}>{company.contact.phone}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Receita est.</dt>
              <dd style={{ margin: '0.2rem 0 0' }}>{company.revenue}</dd>
            </div>
          </dl>

          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Sinais de mercado</h3>
          <div className="imp-actions">
            {company.signals.map((signal) => (
              <span key={signal} className="imp-pill imp-pill--blue">
                {signal}
              </span>
            ))}
          </div>
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Qualificação</h2>
              <p>Critérios padronizados do playbook IMP.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {QUALIFICATION_CRITERIA.map((criterion) => (
              <div key={criterion.id} className="imp-field">
                <label htmlFor={`q-${criterion.id}`}>{criterion.label}</label>
                <select
                  id={`q-${criterion.id}`}
                  value={qualification[criterion.id]}
                  disabled={!canQualify}
                  onChange={(e) => updateQualification(criterion.id, e.target.value)}
                >
                  {criterion.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="imp-field">
              <label htmlFor="q-notes">Observações</label>
              <textarea
                id="q-notes"
                value={qualification.notes}
                disabled={!canQualify}
                onChange={(e) => updateQualification('notes', e.target.value)}
                placeholder="Contexto para o operador BDR…"
              />
            </div>
          </div>

          <div className="imp-actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="imp-btn imp-btn--ghost"
              disabled={!canQualify}
              onClick={handleSave}
            >
              Salvar qualificação
            </button>
            <button
              type="button"
              className="imp-btn imp-btn--primary"
              disabled={!canQualify || !canSendBdr}
              onClick={handleSaveAndSend}
            >
              Qualificar e enviar ao BDR
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
