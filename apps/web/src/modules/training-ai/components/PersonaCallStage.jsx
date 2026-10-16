import { useState } from 'react'
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
  liveText = '',
  listening = false,
  onListeningChange,
  onFinish,
  showTranscript = false,
  onToggleTranscript,
  sttSupported = true,
  audioOnly = false,
  bargeInAvailable = false,
  bargeIn = false,
  onToggleBargeIn,
  script = null,
  soundNotice = '',
}) {
  const [scriptOpen, setScriptOpen] = useState(true)
  const scriptLines = script
    ? [...(script.instructions || [])].filter(Boolean)
    : []
  const hasScript = Boolean(script && (script.objective || scriptLines.length || script.hints?.length))
  const speaking = callState === 'speaking'
  const connecting = callState === 'connecting'

  const stateLabel = connecting
    ? 'Pensando…'
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
        {liveText ? (
          <div className="training-ai__call-live" aria-live="polite">
            <span className="training-ai__meta">Você</span> {liveText}
          </div>
        ) : null}
      </div>

      {soundNotice ? (
        <p className="training-ai__call-sound-notice" role="status">
          {soundNotice}
        </p>
      ) : null}

      {hasScript ? (
        <section className="training-ai__call-script" aria-label="Roteiro da conversa">
          <button
            type="button"
            className="training-ai__call-script-toggle"
            onClick={() => setScriptOpen((value) => !value)}
            aria-expanded={scriptOpen}
          >
            Roteiro {scriptOpen ? '▾' : '▸'}
          </button>
          {scriptOpen ? (
            <div className="training-ai__call-script-body">
              {script.objective ? (
                <p>
                  <strong>Objetivo:</strong> {script.objective}
                </p>
              ) : null}
              {scriptLines.length ? (
                <ol>
                  {scriptLines.map((item, index) => (
                    <li key={`${index}-${item}`}>{item}</li>
                  ))}
                </ol>
              ) : null}
              {script.hints?.length ? (
                <>
                  <strong>Dicas:</strong>
                  <ul>
                    {script.hints.map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="training-ai__call-bar">
        <button
          type="button"
          className={`training-ai__call-mic-btn ${listening ? 'is-listening' : ''}`}
          onClick={() => onListeningChange?.(!listening)}
          aria-pressed={listening}
          disabled={!sttSupported}
        >
          {listening ? 'Pausar microfone' : 'Falar'}
        </button>
        <button
          type="button"
          className="training-ai__call-transcript-btn"
          onClick={() => onToggleTranscript?.(!showTranscript)}
        >
          {showTranscript ? 'Ocultar transcrição' : 'Ver transcrição'}
        </button>
        {bargeInAvailable ? (
          <button
            type="button"
            className="training-ai__call-transcript-btn"
            onClick={() => onToggleBargeIn?.(!bargeIn)}
            aria-pressed={bargeIn}
            title="Com a opção ligada, você pode interromper o agente falando por cima. Use fones de ouvido para evitar eco."
          >
            {bargeIn ? 'Interrupção: ligada' : 'Interrupção: desligada'}
          </button>
        ) : null}
        <button type="button" className="training-ai__call-hangup-btn" onClick={onFinish}>
          Encerrar
        </button>
      </div>
      <p className="training-ai__voice-hint">
        {sttSupported
          ? bargeInAvailable && bargeIn
            ? 'Fale normalmente: ao fazer uma pausa, sua fala é enviada. Você pode interromper o agente falando por cima (use fones de ouvido para evitar eco).'
            : 'Fale normalmente: ao fazer uma pausa, sua fala é enviada e o agente responde. O microfone reabre sozinho.'
          : 'Este navegador não reconhece voz (use o Chrome ou o Edge); digite a sua fala abaixo.'}
      </p>
    </div>
  )
}
