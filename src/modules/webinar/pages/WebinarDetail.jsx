import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import WebinarSessionGate from '../components/WebinarSessionGate.jsx'
import { isWebinarServiceConfigured } from '../config/webinarConfig.js'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'
import { openSidecarMediaRoom } from '../services/sidecarMediaLaunch.js'
import {
  formatWebinarWhen,
  normalizeWebinar,
  webinarStatusLabel,
  webinarStatusTone,
} from '../utils/webinarNormalize.js'

const LAUNCH_COPY = {
  missing_url: 'Configure VITE_WEBINAR_URL para abrir Studio/Live no sidecar.',
  missing_webinar_id: 'ID do webinar ausente.',
  popup_blocked: 'Pop-up bloqueado — permita novas abas para este site.',
  invalid_url: 'URL do sidecar inválida.',
}

export default function WebinarDetailPage() {
  const { webinarId } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const fromBdr = Boolean(location.state?.fromBdr)
  const returnTo = location.state?.returnTo || '/modules/bdr/agendamentos'
  const { apiGet, ensureSession, status } = useWebinarSession()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [launchHint, setLaunchHint] = useState('')
  const [busyKind, setBusyKind] = useState('')

  useEffect(() => {
    if (status === 'idle' || status === 'error') void ensureSession()
  }, [ensureSession, status])

  useEffect(() => {
    if (!webinarId) return undefined
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const payload = await apiGet(`/client/webinars/${webinarId}`)
        const raw = payload?.webinar || payload
        if (!cancelled) setItem(normalizeWebinar(raw))
      } catch (err) {
        if (!cancelled) {
          setItem(null)
          setError(err instanceof Error ? err.message : 'Webinar não encontrado')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [apiGet, webinarId])

  async function handleOpenMedia(kind) {
    setLaunchHint('')
    setBusyKind(kind)
    try {
      const result = await openSidecarMediaRoom({
        kind,
        webinarId: item?.id || webinarId,
        user: user?.username
          ? {
              username: user.username,
              name: user.name,
              role: user.role,
              profile: user.profile,
            }
          : undefined,
        returnTo: `${window.location.origin}/modules/webinar/webinars/${item?.id || webinarId}`,
      })
      if (!result.ok) {
        setLaunchHint(LAUNCH_COPY[result.reason] || 'Não foi possível abrir a sala.')
        return
      }
      setLaunchHint(
        result.handoff
          ? kind === 'live'
            ? 'Live aberto com SSO no sidecar.'
            : 'Studio aberto com SSO no sidecar.'
          : kind === 'live'
            ? 'Live aberto no sidecar (sem handoff).'
            : 'Studio aberto no sidecar (sem handoff).',
      )
    } finally {
      setBusyKind('')
    }
  }

  const sidecarReady = isWebinarServiceConfigured()

  return (
    <WebinarSessionGate>
      <section className="imp-module webinar-page">
        <header className="webinar-page__intro webinar-page__intro--row">
          <div>
            <h2>{item?.title || 'Detalhe do webinar'}</h2>
            <p>
              {fromBdr
                ? 'Aberto a partir do agendamento BDR (M4)'
                : 'Detalhe in-app · Studio/Live via deep-link (M3c-lite)'}
            </p>
          </div>
          <div className="training-ai__page-header-actions">
            {fromBdr ? (
              <Link to={returnTo} className="imp-btn imp-btn--primary">
                ← Voltar ao BDR
              </Link>
            ) : null}
            <Link to="/modules/webinar/webinars" className="imp-btn imp-btn--ghost">
              Lista
            </Link>
          </div>
        </header>

        {loading ? <p className="webinar-launcher__note">Carregando…</p> : null}
        {error ? (
          <p className="webinar-launcher__error" role="alert">
            {error}
          </p>
        ) : null}

        {item ? (
          <div className="imp-panel">
            <div className="imp-panel__header">
              <div>
                <h2>{item.title}</h2>
                <p>{item.description || 'Sem descrição'}</p>
              </div>
              <span className={`imp-pill imp-pill--${webinarStatusTone(item.status)}`}>
                {webinarStatusLabel(item.status)}
              </span>
            </div>

            <dl className="webinar-m3__detail-grid">
              <div>
                <dt>ID</dt>
                <dd>{item.id}</dd>
              </div>
              <div>
                <dt>Quando</dt>
                <dd>{formatWebinarWhen(item.scheduledDate)}</dd>
              </div>
              <div>
                <dt>Duração</dt>
                <dd>{item.durationMinutes ? `${item.durationMinutes} min` : '—'}</dd>
              </div>
              <div>
                <dt>Apresentador</dt>
                <dd>{item.presenterName || '—'}</dd>
              </div>
              <div>
                <dt>Timezone</dt>
                <dd>{item.timezone || '—'}</dd>
              </div>
              <div>
                <dt>Máx. participantes</dt>
                <dd>{item.maxParticipants ?? '—'}</dd>
              </div>
            </dl>

            <div className="webinar-m3c__media-actions">
              <button
                type="button"
                className="imp-btn imp-btn--primary"
                disabled={!sidecarReady || Boolean(busyKind)}
                onClick={() => handleOpenMedia('studio')}
              >
                {busyKind === 'studio' ? 'Abrindo Studio…' : 'Abrir Studio (host)'}
              </button>
              <button
                type="button"
                className="imp-btn imp-btn--ghost"
                disabled={!sidecarReady || Boolean(busyKind)}
                onClick={() => handleOpenMedia('live')}
              >
                {busyKind === 'live' ? 'Abrindo Live…' : 'Abrir Live (viewer)'}
              </button>
            </div>

            {launchHint ? (
              <p className="webinar-launcher__note" role="status">
                {launchHint}
              </p>
            ) : null}

            <p className="webinar-launcher__note" style={{ marginTop: '0.75rem' }}>
              M3c-lite: sala real ainda roda no sidecar (`/studio/preview/:id`, `/live/:id`) com
              handoff SSO. Port completo da UI do Studio fica para M3c-full.
              {!sidecarReady ? ' Defina VITE_WEBINAR_URL para habilitar.' : ''}
            </p>
          </div>
        ) : null}
      </section>
    </WebinarSessionGate>
  )
}
