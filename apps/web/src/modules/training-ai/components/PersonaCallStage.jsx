import AgentAvatar from './AgentAvatar.jsx'

/**
 * Persona call stage (voice mode): the persona's name, role and caption while she speaks.
 * Speaking state is driven by the avatar engine (browser voice today; a video avatar such as HeyGen or D-ID
 * would plug in behind the same AvatarProvider contract, see services/avatar/).
 */
export default function PersonaCallStage({
  persona,
  callState = 'idle',
  caption = '',
  listening = false,
  onListeningChange,
  onFinish,
  showTranscript = false,
  onToggleTranscript,
  sttSupported = true,
  audioOnly = false,
}) {
  const speaking = callState === 'speaking'
  const connecting = callState === 'connecting'

  const stateLabel = connecting
    ? 'Conectando…'
    : speaking
      ? `${persona?.name || 'Persona'} está falando…`
      : listening
        ? 'Ouvindo você…'
        : 'Aguardando sua fala'

  return (
    <div className="training-ai__call-stage">
      <div className="training-ai__call-stage-top">
        <span className={`training-ai__call-status training-ai__call-status--${callState}`}>
          <span className="training-ai__call-status-dot" aria-hidden="true" />
          {stateLabel}
        </span>
        <span className="training-ai__meta">{audioOnly ? 'Somente áudio' : 'Chamada por voz'}</span>
      </div>

      <div className="training-ai__call-persona">
        {audioOnly ? null : (
          <div
            className={`training-ai__call-avatar-ring ${speaking ? 'is-speaking' : ''}`}
            aria-hidden="true"
          >
            <AgentAvatar
              id={persona?.id}
              name={persona?.name}
              size="lg"
              photo={persona?.avatarData}
              className="training-ai__call-avatar"
            />
          </div>
        )}
        <strong className="training-ai__call-persona-name">{persona?.name || 'Persona'}</strong>
        <span className="training-ai__call-persona-role">
          {persona?.role}
          {persona?.company ? ` · ${persona.company}` : ''}
        </span>

        <div className="training-ai__call-caption" aria-live="polite">
          {caption ? caption : <span className="training-ai__meta">—</span>}
        </div>
      </div>

      <div className="training-ai__call-bar">
        <button
          type="button"
          className={`training-ai__call-mic-btn ${listening ? 'is-listening' : ''}`}
          onClick={() => onListeningChange?.(!listening)}
          aria-pressed={listening}
          disabled={!sttSupported}
        >
          {listening ? 'Parar de falar' : 'Falar'}
        </button>
        <button
          type="button"
          className="training-ai__call-transcript-btn"
          onClick={() => onToggleTranscript?.(!showTranscript)}
        >
          {showTranscript ? 'Ocultar transcrição' : 'Ver transcrição'}
        </button>
        <button type="button" className="training-ai__call-hangup-btn" onClick={onFinish}>
          Encerrar
        </button>
      </div>
      <p className="training-ai__voice-hint">
        {sttSupported ? 'Use o microfone para ditar e revise o texto abaixo antes de enviar.' : 'Este navegador não reconhece voz (use o Chrome ou o Edge); digite a sua fala abaixo.'}
      </p>
    </div>
  )
}
