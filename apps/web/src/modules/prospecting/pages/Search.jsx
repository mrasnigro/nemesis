import { Link, useNavigate } from 'react-router-dom'
import { COMPANY_SEGMENTS } from '../data/seeds.js'
import { useProspecting } from '../context/ProspectingContext.jsx'

export default function ProspectSearchPage() {
  const navigate = useNavigate()
  const {
    metrics,
    query,
    setQuery,
    segment,
    setSegment,
    results,
    selectCompany,
    qualifiedIds,
    canSearch,
    canSendBdr,
  } = useProspecting()

  function openQualify(companyId) {
    selectCompany(companyId)
    navigate(`/modules/prospecting/qualify/${companyId}`)
  }

  return (
    <section className="imp-module">
      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Buscas hoje</p>
          <strong className="accent">{metrics.searchedToday}</strong>
          <span>Simulação</span>
        </article>
        <article className="imp-metric">
          <p>Qualificados</p>
          <strong>{metrics.qualified}</strong>
          <span>Prontos para BDR</span>
        </article>
        <article className="imp-metric">
          <p>Enviados ao BDR</p>
          <strong className="success">{metrics.sentToBdr}</strong>
          <span>Fila outbound</span>
        </article>
        <article className="imp-metric">
          <p>Taxa de aceite</p>
          <strong>{metrics.conversionHint}</strong>
          <span>Histórico mock</span>
        </article>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Busca de empresas</h2>
            <p>Pesquise por nome, cidade ou contato e qualifique o prospect.</p>
          </div>
          <div className="imp-actions">
            <Link to="/modules/prospecting/enviar-bdr" className="imp-btn imp-btn--primary">
              Enviar para BDR ({qualifiedIds.length})
            </Link>
          </div>
        </div>

        <div className="imp-grid-2" style={{ marginBottom: '1rem' }}>
          <div className="imp-field">
            <label htmlFor="prospect-query">Buscar</label>
            <input
              id="prospect-query"
              value={query}
              disabled={!canSearch}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: Nexo, Campinas, Marina…"
            />
          </div>
          <div className="imp-field">
            <label htmlFor="prospect-segment">Segmento</label>
            <select
              id="prospect-segment"
              value={segment}
              disabled={!canSearch}
              onChange={(e) => setSegment(e.target.value)}
            >
              <option value="all">Todos</option>
              {COMPANY_SEGMENTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table className="imp-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Segmento</th>
              <th>Contato</th>
              <th>Score</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.map((company) => {
              const qualified = qualifiedIds.includes(company.id)
              return (
                <tr key={company.id}>
                  <td>
                    <strong>{company.name}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {company.city}
                    </div>
                  </td>
                  <td>{company.segment}</td>
                  <td>
                    {company.contact.name}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {company.contact.role}
                    </div>
                  </td>
                  <td>{company.score}</td>
                  <td>
                    <span className={`imp-pill ${qualified ? 'imp-pill--green' : 'imp-pill--muted'}`}>
                      {qualified ? 'Qualificado' : 'Novo'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="imp-btn imp-btn--ghost"
                      onClick={() => openQualify(company.id)}
                    >
                      Qualificar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {!canSendBdr ? (
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
            Sem permissão para enviar à fila BDR.
          </p>
        ) : null}
      </div>
    </section>
  )
}
