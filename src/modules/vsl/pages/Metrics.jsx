import { Link, useParams } from 'react-router-dom'
import { useVsl } from '../context/VslContext.jsx'

export default function VslMetricsPage() {
  const { campaignId } = useParams()
  const { getCampaign, canMetrics } = useVsl()
  const campaign = getCampaign(campaignId)

  if (!canMetrics) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Sem permissão para métricas VSL.</div>
      </section>
    )
  }

  if (!campaign) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Campanha não encontrada. <Link to="/modules/vsl">Voltar</Link>
        </div>
      </section>
    )
  }

  const completeRate =
    campaign.plays > 0 ? Math.round((campaign.completes / campaign.plays) * 100) : 0
  const ctaRate =
    campaign.plays > 0 ? Math.round((campaign.ctaClicks / campaign.plays) * 100) : 0

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to={`/modules/vsl/${campaignId}`} className="imp-btn imp-btn--ghost">
          ← Voltar à configuração
        </Link>
        <Link to="/modules/prospecting" className="imp-btn imp-btn--ghost">
          Enviar leads à Prospecção
        </Link>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Métricas de conversão</h2>
            <p>{campaign.name}</p>
          </div>
        </div>
      </div>

      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Plays</p>
          <strong className="accent">{campaign.plays}</strong>
          <span>Inícios de vídeo</span>
        </article>
        <article className="imp-metric">
          <p>Completions</p>
          <strong>{campaign.completes}</strong>
          <span>{completeRate}% do play</span>
        </article>
        <article className="imp-metric">
          <p>Cliques no CTA</p>
          <strong>{campaign.ctaClicks}</strong>
          <span>{ctaRate}% CTR</span>
        </article>
        <article className="imp-metric">
          <p>Conversões</p>
          <strong className="success">{campaign.conversions}</strong>
          <span>CVR {campaign.cvr}%</span>
        </article>
      </div>

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Funil do vídeo</h2>
              <p>Play → completar → CTA → conversão</p>
            </div>
          </div>
          {[
            { label: 'Play', value: 100 },
            { label: 'Completion', value: completeRate },
            { label: 'CTA', value: ctaRate },
            {
              label: 'Conversão',
              value:
                campaign.plays > 0
                  ? Math.round((campaign.conversions / campaign.plays) * 100)
                  : 0,
            },
          ].map((step) => (
            <div key={step.label} style={{ marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{step.label}</span>
                <strong style={{ fontSize: '0.82rem' }}>{step.value}%</strong>
              </div>
              <div className="imp-progress">
                <span style={{ width: `${step.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Leitura operacional</h2>
              <p>Sugestões com base nos números mock.</p>
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)' }}>
            <li style={{ marginBottom: '0.4rem' }}>
              CTA em “{campaign.ctaPlacement}” — teste mid-video se completion &gt; 50%.
            </li>
            <li style={{ marginBottom: '0.4rem' }}>
              Oferta atual: {campaign.offer}. Alinhe handoff com BDR em &lt; 1h.
            </li>
            <li style={{ marginBottom: '0.4rem' }}>
              Cruze conversores com Radar para personalizar follow-up.
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
