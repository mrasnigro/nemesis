import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CTA_PLACEMENTS, STATUS_LABELS } from '../data/seeds.js'
import { useVsl } from '../context/VslContext.jsx'

export default function VslConfigurePage() {
  const { campaignId } = useParams()
  const { getCampaign, updateLanding, publishCampaign, saveMessage, canConfigure } = useVsl()
  const campaign = getCampaign(campaignId)

  const [form, setForm] = useState({
    headline: '',
    subheadline: '',
    ctaLabel: '',
    ctaPlacement: 'mid',
    offer: '',
  })

  useEffect(() => {
    if (!campaign) return
    setForm({
      headline: campaign.headline,
      subheadline: campaign.subheadline,
      ctaLabel: campaign.ctaLabel,
      ctaPlacement: campaign.ctaPlacement,
      offer: campaign.offer,
    })
  }, [campaign])

  if (!campaign) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Campanha não encontrada. <Link to="/modules/vsl">Voltar</Link>
        </div>
      </section>
    )
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave(e) {
    e.preventDefault()
    updateLanding(campaignId, form)
  }

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to="/modules/vsl" className="imp-btn imp-btn--ghost">
          ← Voltar às campanhas
        </Link>
        <Link to={`/modules/vsl/${campaignId}/metricas`} className="imp-btn imp-btn--ghost">
          Ver métricas
        </Link>
      </div>

      {saveMessage?.campaignId === campaignId ? (
        <div className="imp-toast">{saveMessage.text}</div>
      ) : null}

      <div className="imp-grid-2">
        <form className="imp-panel" onSubmit={handleSave}>
          <div className="imp-panel__header">
            <div>
              <h2>Configuração da landing</h2>
              <p>
                {campaign.name} · {STATUS_LABELS[campaign.status]}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div className="imp-field">
              <label htmlFor="vsl-headline">Headline</label>
              <input
                id="vsl-headline"
                value={form.headline}
                disabled={!canConfigure}
                onChange={(e) => handleChange('headline', e.target.value)}
              />
            </div>
            <div className="imp-field">
              <label htmlFor="vsl-sub">Subheadline</label>
              <textarea
                id="vsl-sub"
                value={form.subheadline}
                disabled={!canConfigure}
                onChange={(e) => handleChange('subheadline', e.target.value)}
              />
            </div>
            <div className="imp-field">
              <label htmlFor="vsl-offer">Oferta</label>
              <input
                id="vsl-offer"
                value={form.offer}
                disabled={!canConfigure}
                onChange={(e) => handleChange('offer', e.target.value)}
              />
            </div>
            <div className="imp-field">
              <label htmlFor="vsl-cta">Texto do CTA</label>
              <input
                id="vsl-cta"
                value={form.ctaLabel}
                disabled={!canConfigure}
                onChange={(e) => handleChange('ctaLabel', e.target.value)}
              />
            </div>
            <div className="imp-field">
              <label htmlFor="vsl-placement">Posição do CTA</label>
              <select
                id="vsl-placement"
                value={form.ctaPlacement}
                disabled={!canConfigure}
                onChange={(e) => handleChange('ctaPlacement', e.target.value)}
              >
                {CTA_PLACEMENTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="imp-actions" style={{ marginTop: '1rem' }}>
            <button type="submit" className="imp-btn imp-btn--primary" disabled={!canConfigure}>
              Salvar landing
            </button>
            {campaign.status !== 'live' ? (
              <button
                type="button"
                className="imp-btn imp-btn--success"
                disabled={!canConfigure}
                onClick={() => publishCampaign(campaignId)}
              >
                Publicar campanha
              </button>
            ) : null}
          </div>
        </form>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Preview da oferta</h2>
              <p>Simulação visual da landing (mock).</p>
            </div>
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#0b1220',
            }}
          >
            <div
              style={{
                aspectRatio: '16 / 9',
                display: 'grid',
                placeItems: 'center',
                background:
                  'linear-gradient(145deg, rgba(245,158,11,0.18), rgba(17,24,39,0.95))',
                color: 'var(--text-muted)',
                fontWeight: 700,
              }}
            >
              ▶ Player VSL
            </div>
            <div style={{ padding: '1.1rem 1.2rem 1.3rem' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: '1.2rem' }}>
                {form.headline}
              </h3>
              <p style={{ margin: '0.55rem 0 1rem', color: 'var(--text-muted)' }}>
                {form.subheadline}
              </p>
              <button type="button" className="imp-btn imp-btn--primary">
                {form.ctaLabel || 'CTA'}
              </button>
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Oferta: {form.offer} · CTA em{' '}
                {CTA_PLACEMENTS.find((item) => item.id === form.ctaPlacement)?.label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
