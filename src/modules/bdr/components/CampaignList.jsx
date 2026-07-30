import { campaignStatusLabel } from '../services/formatters.js'
import { useBdrPermissions } from '../hooks/useBdrPermissions.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

export default function CampaignList() {
  const { campaigns, selectedCampaignId, selectCampaign } = useBdrSession()
  const { canSelectCampaign } = useBdrPermissions()

  return (
    <section className="bdr-home__panel">
      <header>
        <h2>Campanhas Ativas</h2>
        <p>Selecione a campanha para operar no discador.</p>
      </header>

      <ul className="bdr-home__campaigns">
        {campaigns.map((campaign) => {
          const selected = selectedCampaignId === campaign.id
          const statusLabel = selected ? 'Selecionada' : campaignStatusLabel(campaign.status)
          return (
            <li key={campaign.id}>
              <button
                type="button"
                className={`bdr-home__campaign${selected ? ' bdr-home__campaign--selected' : ''}`}
                disabled={!canSelectCampaign}
                onClick={() => selectCampaign(campaign.id)}
              >
                <div className="bdr-home__campaign-top">
                  <strong>{campaign.name}</strong>
                  <span>{statusLabel}</span>
                </div>
                <div className="bdr-home__progress" aria-hidden="true">
                  <span style={{ width: `${campaign.progress}%` }} />
                </div>
                <p>
                  {campaign.completed} de {campaign.leads} leads · {campaign.progress}%
                </p>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
