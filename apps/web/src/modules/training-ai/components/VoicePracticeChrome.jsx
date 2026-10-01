import { PRACTICE_MEDIA_MODES } from '../utils/voiceSession.js'

/**
 * Text / voice switch for a practice session. In voice mode the persona speaks her answers and the
 * microphone dictates the trainee's reply into the answer box (browser speech recognition).
 */
export default function VoicePracticeChrome({
  mediaMode,
  onMediaModeChange,
  listening,
  onListeningChange,
  sttSupported = true,
  showMic = true,
}) {
  return (
    <div className="training-ai__voice-chrome">
      <div className="training-ai__media-toggle" role="group" aria-label="Modo de prática">
        {PRACTICE_MEDIA_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`training-ai__media-toggle-btn ${mediaMode === mode.id ? 'is-selected' : ''}`}
            onClick={() => {
              onMediaModeChange?.(mode.id)
              if (mode.id !== 'voice') onListeningChange?.(false)
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {mediaMode === 'voice' ? (
        <div className="training-ai__voice-stage">
          {showMic ? (
            <button
              type="button"
              className={`training-ai__mic-btn ${listening ? 'is-listening' : ''}`}
              onClick={() => onListeningChange?.(!listening)}
              aria-pressed={listening}
              disabled={!sttSupported}
            >
              {listening ? 'Parar de ouvir' : 'Falar'}
            </button>
          ) : null}
          <p className="training-ai__voice-hint">
            {sttSupported
              ? 'O agente fala as respostas. Use o microfone para ditar a sua fala e revise o texto antes de enviar.'
              : 'O agente fala as respostas. Este navegador não reconhece voz (use o Chrome ou o Edge para ditar); digite a sua fala.'}
          </p>
        </div>
      ) : (
        <p className="training-ai__meta" style={{ margin: 0 }}>
          Modo texto ativo. Troque para Voz para ouvir o agente e ditar as suas respostas.
        </p>
      )}
    </div>
  )
}
