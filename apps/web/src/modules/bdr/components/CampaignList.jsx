import { campaignStatusLabel } from '../services/formatters.js'
import { useBdrPermissions } from '../hooks/useBdrPermissions.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

export default function CampaignList() {
  const { campaigns, selectedCampaignId, selectCampaign, hydrated, loadError } = useBdrSession()
  const { canSelectCampaign } = useBdrPermissions()

  return (
    <section className="bdr-home__panel">
      <header>
        <h2>Campanhas Ativas</h2>
      </header>

      {loadError ? (
        <p className="bdr-setup__note" role="alert">
          {loadError}
        </p>
      ) : null}
      {hydrated && !loadError && campaigns.length === 0 ? (
        <p className="bdr-setup__note">
          Nenhuma campanha ainda. Crie uma campanha e importe os leads no painel &ldquo;Telefonia e fila&rdquo;.
        </p>
      ) : null}

      <ul className="bdr-home__campaigns">
        {campaigns.map((campaign) => {
          const selected = selectedCampaignId === campaign.id
          const statusLabel = selected ? 'Selecionada' : campaignStatusLabel(campaign.status)
          const badgeTone = selected
            ? 'selected'
            : campaign.status === 'active'
              ? 'active'
              : 'paused'
          const barTone = campaign.progress >= 100 ? 'complete' : 'active'
          return (
            <li key={campaign.id}>
              <button
                type="button"
                className={`bdr-home__campaign${selected ? ' bdr-home__campaign--selected' : ''}`}
                disabled={!canSelectCampaign}
                onClick={() => selectCampaign(campaign.id)}
              >
                <div className="bdr-home__campaign-top">
                  <strong className="bdr-home__campaign-title">
                    {selected ? (
                      <span className="bdr-home__campaign-check" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    {campaign.name}
                  </strong>
                  <span className={`bdr-home__badge bdr-home__badge--${badgeTone}`}>
                    {statusLabel}
                  </span>
                </div>
                <div className="bdr-home__campaign-meta">
                  <p>
                    {campaign.completed} de {campaign.leads} leads
                  </p>
                  <span>{campaign.progress}%</span>
                </div>
                <div
                  className={`bdr-home__progress bdr-home__progress--${barTone}`}
                  aria-hidden="true"
                >
                  <span style={{ width: `${campaign.progress}%` }} />
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
