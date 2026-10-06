import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad, usePolling } from '../hooks/useLoad.js'
import { useCanEdit } from '../hooks/useCanEdit.js'
import { useBroadcast } from '../hooks/useBroadcast.js'
import { errorMessage } from '../utils/format.js'
import StatusPill from '../components/StatusPill.jsx'
import StaffChatPanel from '../components/StaffChatPanel.jsx'
import { PLATFORM_BASE } from '../PlatformLayout.jsx'

const SIGNAL = {
  idle: { tone: 'idle', label: 'Fora do ar' },
  ok: { tone: 'ok', label: 'Enviando' },
  retrying: { tone: 'warn', label: 'Reenviando…' },
  lost: { tone: 'bad', label: 'Sem conexão — tentando reconectar' },
}

function clock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const part = (value) => String(value).padStart(2, '0')
  return `${part(Math.floor(seconds / 3600))}:${part(Math.floor((seconds % 3600) / 60))}:${part(seconds % 60)}`
}

/** Where the presenter runs a live webinar: preview, controls, real audience numbers and the chat. */
export default function PlatformStudio() {
  const { webinarId } = useParams()
  const canEditWebinar = useCanEdit()
  const { data: webinar, error, loading, reload } = useLoad(() => webinarApi.getWebinar(webinarId), [webinarId])
  const broadcast = useBroadcast(webinarId)
  const { devices, previewStream, openDevices } = broadcast

  const videoRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [audience, setAudience] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  const canEdit = Boolean(webinar) && canEditWebinar(webinar)
  const finished = webinar?.status === 'completed' || webinar?.status === 'cancelled'

  // The camera is asked for as soon as the presenter is allowed to use the studio.
  useEffect(() => {
    if (canEdit && !finished) openDevices()
  }, [canEdit, finished, openDevices])

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = previewStream
  }, [previewStream])

  const refreshAudience = useCallback(async () => {
    try {
      setAudience(await webinarApi.streamState(webinarId))
    } catch {
      /* keep the last numbers */
    }
  }, [webinarId])
  useEffect(() => {
    refreshAudience()
  }, [refreshAudience])
  usePolling(refreshAudience, 3000)

  const isLive = webinar?.status === 'live'
  useEffect(() => {
    if (!isLive) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isLive])

  // Closing the tab mid-broadcast would cut the audience off.
  const { broadcasting } = broadcast
  useEffect(() => {
    if (!broadcasting) return undefined
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [broadcasting])

  async function goLive() {
    setBusy(true)
    setNotice('')
    try {
      if (!broadcast.supported) {
        setNotice('Este navegador não grava vídeo WebM. Use o Chrome, Edge ou Firefox para transmitir.')
        return
      }
      if (!(await openDevices())) return
      // The server only takes video once the webinar is live. A reload mid-broadcast skips this step.
      if (webinar.status !== 'live') await webinarApi.setStatus(webinar.id, 'live')
      broadcast.startBroadcast()
      await reload()
    } catch (err) {
      setNotice(errorMessage(err, 'Não foi possível iniciar a transmissão.'))
    } finally {
      setBusy(false)
    }
  }

  async function endBroadcast() {
    if (!window.confirm('Encerrar a transmissão para todos os participantes?')) return
    setBusy(true)
    setNotice('')
    try {
      broadcast.stopBroadcast()
      await webinarApi.setStatus(webinar.id, 'completed')
      broadcast.closeDevices()
      await reload()
    } catch (err) {
      setNotice(errorMessage(err, 'Não foi possível encerrar a transmissão.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading && !webinar) {
    return (
      <section className="imp-module">
        <p className="webinar-note">Carregando…</p>
      </section>
    )
  }
  if (error && !webinar) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          {error.status === 404 ? 'Webinar não encontrado.' : errorMessage(error)}
          <div className="imp-actions webinar-center">
            <Link to={`${PLATFORM_BASE}/webinars`} className="imp-btn imp-btn--ghost">
              ← Voltar
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const back = `${PLATFORM_BASE}/webinars/${webinar.id}`
  const signal = SIGNAL[broadcast.signal] || SIGNAL.idle
  const startedAt = audience?.startedAt ? new Date(audience.startedAt).getTime() : null
  const onAirFor = isLive && startedAt ? (now - startedAt) / 1000 : 0
  const fatal = broadcast.fatal ? errorMessage(broadcast.fatal) : ''

  if (!canEdit || finished) {
    return (
      <section className="imp-module">
        <header className="webinar-page-header">
          <div>
            <p className="webinar-breadcrumb">
              <Link to={back}>← {webinar.title}</Link>
            </p>
            <h2>
              Estúdio <StatusPill status={webinar.status} />
            </h2>
          </div>
        </header>
        <div className="imp-empty">
          {!canEdit
            ? 'Só o responsável ou o administrador do cliente pode transmitir este webinar.'
            : webinar.status === 'completed'
              ? 'Este webinar já foi encerrado. Para transmitir de novo, crie um novo webinar.'
              : 'Este webinar foi cancelado. Reabra-o como rascunho para transmitir.'}
        </div>
      </section>
    )
  }

  return (
    <section className="imp-module">
      <header className="webinar-page-header">
        <div>
          <p className="webinar-breadcrumb">
            <Link to={back}>← {webinar.title}</Link>
          </p>
          <h2>
            Estúdio <StatusPill status={webinar.status} />
          </h2>
          <p>{webinar.presenterName ? `Apresentador: ${webinar.presenterName}` : 'Transmissão ao vivo'}</p>
        </div>
      </header>

      {notice ? <p className="webinar-note webinar-note--error">{notice}</p> : null}
      {fatal ? <p className="webinar-note webinar-note--error">{fatal}</p> : null}
      {devices.error ? (
        <p className="webinar-note webinar-note--error">
          {devices.error}{' '}
          {devices.status === 'error' ? (
            <button type="button" className="imp-btn imp-btn--ghost" onClick={openDevices}>
              Tentar de novo
            </button>
          ) : null}
        </p>
      ) : null}

      <div className="studio">
        <div className="studio__main">
          <div className="studio__stage">
            <video ref={videoRef} autoPlay muted playsInline aria-label="Pré-visualização do que o público vê" />
            {devices.status !== 'ready' ? (
              <div className="studio__standby">
                {devices.status === 'requesting' ? 'Aguardando permissão de câmera e microfone…' : 'Câmera desligada'}
              </div>
            ) : null}
            {broadcasting ? <span className="studio__badge">AO VIVO</span> : null}
          </div>

          <div className="studio__bar imp-panel">
            <div className="studio__status">
              <span className={`studio__signal studio__signal--${signal.tone}`}>{signal.label}</span>
              {isLive ? (
                <span className="studio__clock" title="Tempo no ar">
                  {clock(onAirFor)}
                </span>
              ) : null}
            </div>

            <div className="imp-actions">
              <button
                type="button"
                className="imp-btn imp-btn--ghost"
                onClick={broadcast.toggleMic}
                disabled={devices.status !== 'ready'}
                aria-pressed={!broadcast.micOn}
              >
                Microfone: {broadcast.micOn ? 'ligado' : 'desligado'}
              </button>
              <button
                type="button"
                className="imp-btn imp-btn--ghost"
                onClick={broadcast.toggleCamera}
                disabled={devices.status !== 'ready'}
                aria-pressed={!broadcast.cameraOn}
              >
                Câmera: {broadcast.cameraOn ? 'ligada' : 'desligada'}
              </button>
              <button
                type="button"
                className="imp-btn imp-btn--ghost"
                onClick={broadcast.sharing ? broadcast.stopScreenShare : broadcast.startScreenShare}
                disabled={devices.status !== 'ready'}
              >
                {broadcast.sharing ? 'Parar compartilhamento' : 'Compartilhar tela'}
              </button>

              {broadcasting ? (
                <button type="button" className="imp-btn imp-btn--primary" disabled={busy} onClick={endBroadcast}>
                  Encerrar transmissão
                </button>
              ) : (
                <button
                  type="button"
                  className="imp-btn imp-btn--primary"
                  disabled={busy || devices.status !== 'ready'}
                  onClick={goLive}
                >
                  {isLive ? 'Retomar transmissão' : 'Iniciar transmissão'}
                </button>
              )}
              {isLive && !broadcasting ? (
                <button type="button" className="imp-btn imp-btn--ghost" disabled={busy} onClick={endBroadcast}>
                  Encerrar
                </button>
              ) : null}
            </div>
          </div>
          {isLive && !broadcasting ? (
            <p className="webinar-note webinar-note--info">
              O webinar está no ar, mas esta janela não está enviando vídeo. Use “Retomar transmissão” para voltar.
            </p>
          ) : null}
        </div>

        <aside className="studio__side">
          <div className="imp-panel">
            <div className="imp-panel__header">
              <div>
                <h3>Audiência</h3>
                <p>Pessoas assistindo agora.</p>
              </div>
            </div>
            <div className="studio__numbers">
              <article className="imp-metric">
                <p>Agora</p>
                <strong className="accent">{audience?.viewers ?? 0}</strong>
              </article>
              <article className="imp-metric">
                <p>Pico</p>
                <strong>{audience?.peakViewers ?? 0}</strong>
              </article>
            </div>
          </div>
          <StaffChatPanel webinarId={webinar.id} closed={false} />
        </aside>
      </div>
    </section>
  )
}
