import { Link } from 'react-router-dom'
import { useRadar } from '../context/RadarContext.jsx'

export default function RadarAnalysisPage() {
  const {
    segments,
    selectedSegment,
    setSelectedSegment,
    analysis,
    analyzing,
    runAnalysis,
    canAnalyze,
  } = useRadar()

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to="/modules/radar" className="imp-btn imp-btn--ghost">
          ← Voltar ao dashboard
        </Link>
      </div>

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Análise de mercado</h2>
              <p>Selecione um segmento e rode a análise simulada.</p>
            </div>
          </div>

          <div className="imp-field" style={{ marginBottom: '1rem' }}>
            <label htmlFor="radar-segment">Segmento</label>
            <select
              id="radar-segment"
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
            >
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.label} (calor {segment.heat})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="imp-btn imp-btn--primary"
            disabled={!canAnalyze || analyzing}
            onClick={runAnalysis}
          >
            {analyzing ? 'Analisando…' : 'Rodar análise'}
          </button>

          <div className="imp-list" style={{ marginTop: '1.25rem' }}>
            {segments.map((segment) => (
              <button
                key={segment.id}
                type="button"
                className={`imp-list-item${selectedSegment === segment.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedSegment(segment.id)}
              >
                <div>
                  <h3>{segment.label}</h3>
                  <p>{segment.opportunities} oportunidades monitoradas</p>
                </div>
                <span className="imp-pill imp-pill--amber">{segment.heat}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Resultado</h2>
              <p>Insight gerado nesta sessão (mock).</p>
            </div>
          </div>

          {!analysis ? (
            <div className="imp-empty">Execute uma análise para ver o relatório.</div>
          ) : (
            <div>
              <div className="imp-toast" style={{ marginBottom: '1rem' }}>
                Análise de {analysis.segmentLabel} gerada em{' '}
                {new Date(analysis.generatedAt).toLocaleTimeString('pt-BR')}
              </div>
              <p style={{ color: 'var(--text-h)' }}>{analysis.narrative}</p>
              <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem' }}>Ações recomendadas</h3>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)' }}>
                {analysis.topActions.map((action) => (
                  <li key={action} style={{ marginBottom: '0.35rem' }}>
                    {action}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: '1rem' }}>
                <p style={{ margin: '0 0 0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Calor do segmento
                </p>
                <div className="imp-progress">
                  <span style={{ width: `${analysis.heat}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
