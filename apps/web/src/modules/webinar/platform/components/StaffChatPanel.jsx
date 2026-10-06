import { useCallback, useEffect, useState } from 'react'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { usePolling } from '../hooks/useLoad.js'
import ChatBox from './ChatBox.jsx'

/** Room chat as the team sees it. Anyone with the module can read it and post as presenter. */
export default function StaffChatPanel({ webinarId, closed }) {
  const [messages, setMessages] = useState([])
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setMessages(await webinarApi.listChat(webinarId))
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [webinarId])

  // First load plus a poll every few seconds; a tick that fails keeps the last messages on screen.
  useEffect(() => {
    refresh()
  }, [refresh])
  usePolling(refresh, 3000)

  async function send(message) {
    const created = await webinarApi.postChat(webinarId, message)
    setMessages((prev) => [...prev, created])
  }

  return (
    <div className="imp-panel">
      <div className="imp-panel__header">
        <div>
          <h3>Chat da sala</h3>
          <p>Mensagens dos participantes e da equipe. Atualiza sozinho.</p>
        </div>
      </div>
      {failed ? <p className="webinar-chat__error">Sem conexão com o chat. Tentando novamente…</p> : null}
      <ChatBox
        messages={messages}
        onSend={send}
        mine={(message) => message.role === 'presenter'}
        disabled={closed}
        placeholder={closed ? 'Webinar encerrado' : 'Responder como apresentador…'}
      />
    </div>
  )
}
