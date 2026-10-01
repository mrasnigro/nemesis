import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildSessionTimeline,
  formatPlayhead,
  nearestMessageId,
} from '../utils/voiceSession.js'

/**
 * Conversation timeline for the Insights report: one marker per message, positioned by its real timestamp.
 * Clicking a marker scrolls the transcript to that message. No audio is stored or played.
 */
export default function SessionAudioPlayer({
  messages = [],
  onSeekMessage,
  activeMessageId,
}) {
  const timeline = useMemo(() => buildSessionTimeline(messages), [messages])
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const lastSeekRef = useRef(null)

  useEffect(() => {
    if (!playing) return undefined
    const id = window.setInterval(() => {
      setPlayhead((prev) => {
        const next = prev + 0.5
        if (next >= timeline.durationSec) {
          setPlaying(false)
          return timeline.durationSec
        }
        return next
      })
    }, 500)
    return () => window.clearInterval(id)
  }, [playing, timeline.durationSec])

  useEffect(() => {
    const messageId = nearestMessageId(timeline.markers, playhead)
    if (!messageId || messageId === lastSeekRef.current) return
    lastSeekRef.current = messageId
    onSeekMessage?.(messageId)
  }, [playhead, timeline.markers, onSeekMessage])

  function seekToRatio(ratio) {
    const next = Math.round(Math.min(1, Math.max(0, ratio)) * timeline.durationSec)
    setPlayhead(next)
    const messageId = nearestMessageId(timeline.markers, next)
    if (messageId) {
      lastSeekRef.current = messageId
      onSeekMessage?.(messageId)
    }
  }

  function handleWaveClick(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    seekToRatio((event.clientX - rect.left) / rect.width)
  }

  function handleMarkerClick(marker) {
    setPlayhead(marker.atSec)
    setPlaying(false)
    lastSeekRef.current = marker.messageId
    onSeekMessage?.(marker.messageId)
  }

  const progressPct =
    timeline.durationSec > 0 ? Math.min(100, (playhead / timeline.durationSec) * 100) : 0

  return (
    <div className="training-ai__session-player">
      <div className="training-ai__session-player-toolbar">
        <button
          type="button"
          className="imp-btn imp-btn--ghost training-ai__session-player-play"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? 'Pausar a linha do tempo' : 'Percorrer a linha do tempo'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="training-ai__session-player-meta">
          <strong>
            {formatPlayhead(playhead)} / {formatPlayhead(timeline.durationSec)}
          </strong>
          <span className="training-ai__meta">
            Linha do tempo da conversa
          </span>
        </div>
      </div>

      <div
        className="training-ai__waveform"
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={timeline.durationSec}
        aria-valuenow={Math.round(playhead)}
        aria-label="Linha do tempo da sessão"
        onClick={handleWaveClick}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            seekToRatio((playhead + 2) / timeline.durationSec)
          } else if (event.key === 'ArrowLeft') {
            seekToRatio((playhead - 2) / timeline.durationSec)
          }
        }}
      >
        <div
          className="training-ai__waveform-progress"
          style={{ width: `${progressPct}%` }}
          aria-hidden="true"
        />
        <div className="training-ai__waveform-markers">
          {timeline.markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              className={`training-ai__waveform-marker training-ai__waveform-marker--${
                marker.sentiment.tone
              } ${activeMessageId === marker.messageId ? 'is-active' : ''}`}
              style={{
                left: `${(marker.atSec / timeline.durationSec) * 100}%`,
              }}
              title={`${formatPlayhead(marker.atSec)} · ${marker.label}`}
              onClick={(event) => {
                event.stopPropagation()
                handleMarkerClick(marker)
              }}
            />
          ))}
        </div>
      </div>

      <ul className="training-ai__sentiment-legend" aria-label="Sentimento estimado por fala">
        <li>
          <span className="training-ai__sentiment-dot training-ai__sentiment-dot--green" />{' '}
          Positivo
        </li>
        <li>
          <span className="training-ai__sentiment-dot training-ai__sentiment-dot--blue" />{' '}
          Curioso
        </li>
        <li>
          <span className="training-ai__sentiment-dot training-ai__sentiment-dot--amber" />{' '}
          Tensão
        </li>
        <li>
          <span className="training-ai__sentiment-dot training-ai__sentiment-dot--muted" />{' '}
          Neutro
        </li>
      </ul>
    </div>
  )
}
