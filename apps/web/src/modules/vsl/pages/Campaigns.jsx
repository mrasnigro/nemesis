import { Link } from 'react-router-dom'
import { STATUS_LABELS } from '../data/seeds.js'
import { useVsl } from '../context/VslContext.jsx'

export default function VslCampaignsPage() {
  const { metrics, campaigns } = useVsl()

  return (
    <section className="imp-module">
      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Campanhas ativas</p>
          <strong className="accent">{metrics.activeCampaigns}</strong>
          <span>No ar agora</span>
        </article>
        <article className="imp-metric">
          <p>Play rate médio</p>
          <strong>{metrics.avgPlayRate}</strong>
          <span>Início → play</span>
        </article>
        <article className="imp-metric">
          <p>CVR médio</p>
          <strong className="success">{metrics.avgCvr}</strong>
          <span>Play → conversão</span>
        </article>
        <article className="imp-metric">
          <p>Reuniões via VSL</p>
          <strong>{metrics.meetingsFromVsl}</strong>
          <span>Este mês</span>
        </article>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Campanhas de VSL</h2>
            <p>Video Sales Letters e páginas de oferta do workspace.</p>
          </div>
        </div>

        <div className="imp-list">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="imp-list-item" style={{ cursor: 'default' }}>
              <div>
                <h3>{campaign.name}</h3>
                <p>
                  Oferta: {campaign.offer} · CVR {campaign.cvr}%
                </p>
                <p>{campaign.headline}</p>
              </div>
              <div className="imp-actions" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                <span
                  className={`imp-pill ${
                    campaign.status === 'live' ? 'imp-pill--green' : 'imp-pill--muted'
                  }`}
                >
                  {STATUS_LABELS[campaign.status]}
                </span>
                <Link to={`/modules/vsl/${campaign.id}`} className="imp-btn imp-btn--ghost">
                  Configurar
                </Link>
                <Link
                  to={`/modules/vsl/${campaign.id}/metricas`}
                  className="imp-btn imp-btn--primary"
                >
                  Métricas
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
