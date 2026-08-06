import { useEffect, useState } from 'react'
import { PRACTICE_MEDIA_MODES } from '../utils/voiceSession.js'

/**
 * Simulation voice chrome — UI stubs only (report R4).
 * Mic toggles a listening visual; STT never runs. Text composer stays the path.
 */
export default function VoicePracticeChrome({
  mediaMode,
  onMediaModeChange,
  listening,
  onListeningChange,
}) {
  const [bars, setBars] = useState(() => Array.from({ length: 28 }, () => 20))

  useEffect(() => {
    if (!listening || mediaMode !== 'voice') {
      setBars(Array.from({ length: 28 }, () => 20))
      return undefined
    }
    const id = window.setInterval(() => {
      setBars(Array.from({ length: 28 }, () => 12 + Math.round(Math.random() * 78)))
    }, 140)
    return () => window.clearInterval(id)
  }, [listening, mediaMode])

  return (
    <div className="training-ai__voice-chrome">
      <div className="training-ai__media-toggle" role="group" aria-label="Modo de prática">
        {PRACTICE_MEDIA_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`training-ai__media-toggle-btn ${
              mediaMode === mode.id ? 'is-selected' : ''
            }`}
            onClick={() => {
              onMediaModeChange?.(mode.id)
              if (mode.id !== 'voice') onListeningChange?.(false)
            }}
          >
            {mode.label}
            {mode.id === 'voice' ? <span className="training-ai__meta"> stub</span> : null}
          </button>
        ))}
      </div>

      {mediaMode === 'voice' ? (
        <div className="training-ai__voice-stage">
          <div className="training-ai__live-waveform" aria-hidden="true">
            {bars.map((height, index) => (
              <span key={`live_${index}`} style={{ height: `${height}%` }} />
            ))}
          </div>
          <button
            type="button"
            className={`training-ai__mic-btn ${listening ? 'is-listening' : ''}`}
            onClick={() => onListeningChange?.(!listening)}
            aria-pressed={listening}
          >
            {listening ? 'Parar escuta' : 'Segurar microfone'}
          </button>
          <p className="training-ai__voice-hint">
            Waveform e microfone são só UI. STT/TTS ainda não estão ligados — digite abaixo o
            que falaria na ligação.
          </p>
        </div>
      ) : (
        <p className="training-ai__meta" style={{ margin: 0 }}>
          Modo texto ativo. Troque para Voz para ver o chrome de chamada (stub).
        </p>
      )}
    </div>
  )
}
