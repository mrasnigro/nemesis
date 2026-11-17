import { useEffect, useRef, useState } from 'react'
import { bdrRepository } from '../services/bdrRepository.js'

const initialState = { status: 'disconnected', message: '' }

export default function AsteriskWebPhone({ onReadyChange, onRemoteHangup, onPhoneLost }) {
  const phoneRef = useRef(null)
  const audioRef = useRef(null)
  const registeredRef = useRef(false)
  const onRemoteHangupRef = useRef(onRemoteHangup)
  useEffect(() => {
    onRemoteHangupRef.current = onRemoteHangup
  }, [onRemoteHangup])
  const [state, setState] = useState(initialState)
  const [muted, setMuted] = useState(false)

  const onPhoneLostRef = useRef(onPhoneLost)
  useEffect(() => {
    onPhoneLostRef.current = onPhoneLost
  }, [onPhoneLost])

  useEffect(() => {
    // Answering and in-call still have a registered phone. Reporting those as "not ready" showed
    // "Conecte o telefone" on top of Atender and could stop a live call.
    onReadyChange(state.status === 'registered' || state.status === 'answering' || state.status === 'in-call')
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
          // The lead already answered. Join the audio without an Atender click.
          onCallReceived: () => {
            setState({ status: 'answering', message: 'A pessoa atendeu. Conectando o áudio…' })
            queueMicrotask(() => {
              void phone.answer().catch((error) => {
                setState({
                  status: 'registered',
                  message: error?.message || 'Não foi possível conectar o áudio.',
                })
                onRemoteHangupRef.current?.()
              })
            })
          },
          onCallAnswered: () => setState({ status: 'in-call', message: 'Chamada conectada.' }),
          onCallHangup: () => {
            setMuted(false)
            setState({ status: 'registered', message: 'Chamada encerrada.' })
            onRemoteHangupRef.current?.()
          },
          onRegistered: () => {
            registeredRef.current = true
            setState({ status: 'registered', message: 'Telefone WebRTC conectado.' })
          },
          onUnregistered: () => {
            setState({
              status: 'disconnected',
              // Never registered in this attempt: Asterisk refused the login (403), not a dropped session.
              message: registeredRef.current
                ? 'Registro SIP encerrado.'
                : 'O Asterisk recusou o ramal ou a senha SIP. Confira o ramal e a senha SIP salvos na configuração do discador.',
            })
            if (registeredRef.current) onPhoneLostRef.current?.()
          },
          onServerDisconnect: () => {
            setState({ status: 'disconnected', message: 'Conexão com o Asterisk perdida.' })
            onPhoneLostRef.current?.()
          },
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
    onPhoneLostRef.current?.()
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
      {state.status === 'connecting' || state.status === 'answering' ? (
        <p role="status">{state.status === 'answering' ? 'Conectando o áudio…' : 'Conectando ao Asterisk…'}</p>
      ) : null}
      {state.status === 'in-call' ? (
        <button type="button" className="bdr-section__cta" onClick={toggleMute}>
          {muted ? 'Ativar microfone' : 'Silenciar microfone'}
        </button>
      ) : null}
      {state.status !== 'disconnected' && state.status !== 'connecting' && state.status !== 'answering' ? (
        <button type="button" className="bdr-section__cta" onClick={() => void disconnect()}>
          Desconectar telefone
        </button>
      ) : null}
    </article>
  )
}
