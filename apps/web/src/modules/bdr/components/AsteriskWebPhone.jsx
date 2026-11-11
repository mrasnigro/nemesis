import { useEffect, useRef, useState } from 'react'
import { bdrRepository } from '../services/bdrRepository.js'

const initialState = { status: 'disconnected', message: '' }

export default function AsteriskWebPhone({ onReadyChange }) {
  const phoneRef = useRef(null)
  const audioRef = useRef(null)
  const registeredRef = useRef(false)
  const [state, setState] = useState(initialState)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    onReadyChange(state.status === 'registered')
  }, [onReadyChange, state.status])

  useEffect(
    () => () => {
      const phone = phoneRef.current
      phoneRef.current = null
      if (phone) void phone.disconnect().catch(() => {})
    },
    [],
  )

  // Connect without a click when the microphone is already allowed and present. When it is not, the button stays:
  // the browser only shows its permission prompt inside a real click, and a missing device must be chosen by hand.
  const autoTriedRef = useRef(false)
  useEffect(() => {
    if (autoTriedRef.current) return undefined
    autoTriedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const permission = await navigator.permissions?.query?.({ name: 'microphone' })
        if (!permission || permission.state !== 'granted') return
        const devices = await navigator.mediaDevices?.enumerateDevices?.()
        const hasMic = devices?.some((device) => device.kind === 'audioinput' && device.deviceId)
        if (!cancelled && hasMic && phoneRef.current == null) void connect()
      } catch {
        // No Permissions API, or it was blocked: leave the manual button.
      }
    })()
    return () => {
      cancelled = true
    }
    // connect reads only refs and config; running this once on mount is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function connect() {
    registeredRef.current = false
    setState({ status: 'connecting', message: '' })
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('WebRTC requer HTTPS e acesso ao microfone neste navegador.')
      }
      const permission = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      permission.getTracks().forEach((track) => track.stop())
      const config = await bdrRepository.getWebRtcConfig()
      const { Web } = await import('sip.js')
      const phone = new Web.SimpleUser(config.server, {
        aor: `sip:${config.extension}@${config.domain}`,
        media: {
          constraints: { audio: true, video: false },
          remote: { audio: audioRef.current },
        },
        delegate: {
          onCallReceived: () => setState({ status: 'incoming', message: 'Chamada recebida — aceite para falar.' }),
          onCallAnswered: () => setState({ status: 'in-call', message: 'Chamada conectada.' }),
          onCallHangup: () => {
            setMuted(false)
            setState({ status: 'registered', message: 'Chamada encerrada.' })
          },
          onRegistered: () => {
            registeredRef.current = true
            setState({ status: 'registered', message: 'Telefone WebRTC conectado.' })
          },
          onUnregistered: () =>
            setState({
              status: 'disconnected',
              // Never registered in this attempt: Asterisk refused the login (403), not a dropped session.
              message: registeredRef.current
                ? 'Registro SIP encerrado.'
                : 'O Asterisk recusou o ramal ou a senha SIP. Confira o ramal e a senha SIP salvos na configuração do discador.',
            }),
          onServerDisconnect: () => setState({ status: 'disconnected', message: 'Conexão com o Asterisk perdida.' }),
        },
        userAgentOptions: {
          authorizationUsername: config.extension,
          authorizationPassword: config.password,
          logBuiltinEnabled: false,
        },
      })
      phoneRef.current = phone
      await phone.connect()
      await phone.register()
    } catch (error) {
      const phone = phoneRef.current
      phoneRef.current = null
      if (phone) await phone.disconnect().catch(() => {})
      setState({
        status: 'disconnected',
        message: error?.message || 'Não foi possível conectar o telefone WebRTC.',
      })
    }
  }

  async function answer() {
    try {
      await phoneRef.current?.answer()
    } catch (error) {
      setState({ status: 'registered', message: error?.message || 'Não foi possível atender a chamada.' })
    }
  }

  async function decline() {
    try {
      await phoneRef.current?.decline()
      setState({ status: 'registered', message: 'Chamada recusada.' })
    } catch (error) {
      setState({ status: 'registered', message: error?.message || 'Não foi possível recusar a chamada.' })
    }
  }

  function toggleMute() {
    const phone = phoneRef.current
    if (!phone) return
    if (muted) phone.unmute()
    else phone.mute()
    setMuted(!muted)
  }

  async function disconnect() {
    const phone = phoneRef.current
    phoneRef.current = null
    try {
      await phone?.disconnect()
      setState(initialState)
    } catch (error) {
      setState({ status: 'disconnected', message: error?.message || 'Falha ao desconectar do Asterisk.' })
    }
  }

  return (
    <article className="bdr-section__card" aria-live="polite">
      <audio ref={audioRef} autoPlay playsInline hidden />
      <p><strong>Telefone WebRTC:</strong> {state.message || 'desconectado'}</p>
      {state.status === 'disconnected' ? (
        <button type="button" className="bdr-section__cta" onClick={connect}>
          Conectar telefone e permitir microfone
        </button>
      ) : null}
      {state.status === 'connecting' ? <p role="status">Conectando ao Asterisk…</p> : null}
      {state.status === 'incoming' ? (
        <div className="bdr-setup__row">
          <button type="button" className="bdr-section__cta" onClick={() => void answer()}>Atender</button>
          <button type="button" className="bdr-section__cta" onClick={() => void decline()}>Recusar</button>
        </div>
      ) : null}
      {state.status === 'in-call' ? (
        <button type="button" className="bdr-section__cta" onClick={toggleMute}>
          {muted ? 'Ativar microfone' : 'Silenciar microfone'}
        </button>
      ) : null}
      {state.status !== 'disconnected' && state.status !== 'connecting' && state.status !== 'incoming' ? (
        <button type="button" className="bdr-section__cta" onClick={() => void disconnect()}>
          Desconectar telefone
        </button>
      ) : null}
    </article>
  )
}
