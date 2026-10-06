import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publicWebinarApi } from '../services/webinarPlatformApi.js'
import { usePolling } from '../hooks/useLoad.js'
import { formatDateTime } from '../utils/format.js'
import ChatBox from '../components/ChatBox.jsx'
import LivePlayer from './LivePlayer.jsx'
import PublicShell from './PublicShell.jsx'

/** Time a visitor must spend watching the live picture before they count as having attended. */
const ATTEND_AFTER_MS = 30_000

const BANNER = {
  draft: { tone: 'wait', text: 'Este webinar ainda não foi aberto. Volte mais perto do horário.' },
  scheduled: { tone: 'wait', text: 'Aguardando o início. Esta página atualiza sozinha.' },
  live: { tone: 'live', text: 'Ao vivo agora.' },
  completed: { tone: 'done', text: 'Este webinar foi encerrado. Obrigado por participar!' },
  cancelled: { tone: 'done', text: 'Este webinar foi cancelado.' },
}

/** The visitor's page after registering. The lead id in the address is their key to the room. */
export default function WebinarRoom() {
  const { leadId } = useParams()
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState([])
  const attended = useRef(false)

  const refreshSession = useCallback(async () => {
    try {
      setSession(await publicWebinarApi.session(leadId))
      setError(null)
    } catch (err) {
      // A dropped connection keeps the room on screen; only "not found" ends it.
      if (err.status === 404) setError(err)
    }
  }, [leadId])

  const refreshChat = useCallback(async () => {
    try {
      setMessages(await publicWebinarApi.listChat(leadId))
    } catch {
      /* keep the messages already shown */
    }
  }, [leadId])

  useEffect(() => {
    refreshSession()
    refreshChat()
  }, [refreshSession, refreshChat])
  usePolling(refreshSession, 10_000, !error)
  usePolling(refreshChat, 3_000, !error)

  // Attending means watching: the clock only runs while the picture is actually playing.
  const [watching, setWatching] = useState(false)
  useEffect(() => {
    if (!watching || attended.current) return undefined
    const timer = setTimeout(() => {
      attended.current = true
      publicWebinarApi.attend(leadId).catch(() => {
        attended.current = false
      })
    }, ATTEND_AFTER_MS)
    return () => clearTimeout(timer)
  }, [watching, leadId])

  if (error) {
    return (
      <PublicShell>
        <div className="public-card">
          <h1>Inscrição não encontrada</h1>
          <p>O endereço pode estar incompleto. Use o código de acesso para se inscrever de novo.</p>
          <Link to="/webinar/entrar" className="public-button">
            Informar código
          </Link>
        </div>
      </PublicShell>
    )
  }
  if (!session) {
    return (
      <PublicShell>
        <div className="public-card">
          <p>Carregando…</p>
        </div>
      </PublicShell>
    )
  }

  const { webinar, lead } = session
  const banner = BANNER[webinar.status] || BANNER.scheduled
  const closed = webinar.status === 'completed' || webinar.status === 'cancelled'

  async function send(message) {
    const created = await publicWebinarApi.postChat(leadId, message)
    setMessages((prev) => [...prev, created])
  }

  return (
    <PublicShell color={webinar.registrationColor}>
      <div className="public-room">
        <section className="public-card public-room__info">
          {webinar.status === 'live' ? (
            <LivePlayer url={publicWebinarApi.streamUrl(leadId)} live onPlayingChange={setWatching} />
          ) : null}
          <p className="public-hello">Olá, {lead.name}! Você está inscrito.</p>
          <h1>{webinar.title}</h1>
          <p className={`public-banner public-banner--${banner.tone}`} role="status">
            {banner.text}
          </p>
          <p className="public-when">
            {formatDateTime(webinar.scheduledAt, webinar.timezone)} · {webinar.durationMinutes} min
          </p>
          {webinar.description ? <p>{webinar.description}</p> : null}
          {webinar.presenterName ? (
            <div className="public-presenter">
              {webinar.presenterImageUrl ? <img src={webinar.presenterImageUrl} alt="" /> : null}
              <div>
                <strong>{webinar.presenterName}</strong>
                {webinar.presenterBio ? <p>{webinar.presenterBio}</p> : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className="public-card public-room__chat">
          <h2>Chat</h2>
          <ChatBox
            messages={messages}
            onSend={send}
            mine={(message) => message.role === 'participant' && message.senderName === lead.name}
            disabled={closed}
            placeholder={closed ? 'Chat encerrado' : 'Faça uma pergunta ou comente…'}
            height={420}
          />
          {closed ? null : <p className="public-hint">Você aparece como {lead.name}.</p>}
        </section>
      </div>
    </PublicShell>
  )
}
