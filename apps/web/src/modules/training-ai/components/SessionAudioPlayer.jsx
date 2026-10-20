import { useEffect, useMemo, useRef, useState } from 'react'
import { trainingApi } from '../services/api/client.js'
import { estimateMessageSentiment, formatPlayhead } from '../utils/voiceSession.js'

/**
 * Player of a call in the report. The API keeps one recording per spoken message (the trainee's words, then the
 * persona's), so the call plays message after message and the transcript follows along. One marker per message,
 * coloured by the estimated sentiment; clicking a marker jumps to it (and plays from there when there is audio).
 * Calls from before recordings were kept have no clips: the markers only move the transcript.
 */
export default function SessionAudioPlayer({
  sessionId,
  messages = [],
  onSeekMessage,
  activeMessageId,
  legacyAudioUrl = '',
}) {
  const audioRef = useRef(null)
  const [urls, setUrls] = useState({}) // messageId -> object URL of its recording
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState(0) // index in `playable`
  const [playing, setPlaying] = useState(false)
  const [fraction, setFraction] = useState(0) // how much of the current clip has played
  const [clock, setClock] = useState({ at: 0, length: 0 })
  const [failed, setFailed] = useState(false)

  const clipIds = useMemo(
    () => messages.filter((message) => message.hasAudio).map((message) => message.id).join('|'),
    [messages],
  )

  // All the clips are fetched when the report opens: a play button then starts at once, inside the tap that
  // pressed it (phones refuse sound that starts after a wait).
  useEffect(() => {
    if (!sessionId || !clipIds) return undefined
    let cancelled = false
    const created = []
    setLoading(true)
    setFailed(false)
    Promise.allSettled(
      clipIds.split('|').map((id) =>
        trainingApi.fetchMessageAudio(sessionId, id).then((blob) => {
          const url = URL.createObjectURL(blob)
          created.push(url)
          return [id, url]
        }),
      ),
    ).then((results) => {
      if (cancelled) return
      const loaded = Object.fromEntries(results.filter((item) => item.status === 'fulfilled').map((item) => item.value))
      setUrls(loaded)
      setFailed(Object.keys(loaded).length === 0)
      setLoading(false)
    })
    return () => {
      cancelled = true
      audioRef.current?.pause()
      setPlaying(false)
      setUrls({})
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [sessionId, clipIds])

  const playable = useMemo(() => messages.filter((message) => urls[message.id]), [messages, urls])
  const total = Math.max(1, messages.length)
  const currentId = playable[position]?.id
  const currentIndex = Math.max(0, messages.findIndex((message) => message.id === currentId))
  const progressPct = playing || fraction > 0 ? Math.min(100, ((currentIndex + fraction) / total) * 100) : 0

  function playAt(index) {
    const audio = audioRef.current
    const message = playable[index]
    if (!audio || !message) return
    setPosition(index)
    setFraction(0)
    audio.src = urls[message.id]
    onSeekMessage?.(message.id)
    audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    )
  }

  function toggle() {
    const audio = audioRef.current
    if (!audio || playable.length === 0) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else if (audio.src && !audio.ended && audio.currentSrc) {
      audio.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      )
    } else {
      playAt(audio.ended ? 0 : position)
    }
  }

  function handleEnded() {
    if (position + 1 < playable.length) {
      playAt(position + 1)
    } else {
      setPlaying(false)
      setFraction(1)
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio) return
    const length = Number.isFinite(audio.duration) ? audio.duration : 0
    setClock({ at: audio.currentTime, length })
    setFraction(length > 0 ? Math.min(1, audio.currentTime / length) : 0)
  }

  /** The first message at or after `index` that has a recording. */
  function playableFrom(index) {
    const found = playable.findIndex((message) => messages.indexOf(message) >= index)
    return found === -1 ? playable.length - 1 : found
  }

  function jumpTo(messageIndex) {
    const message = messages[messageIndex]
    if (!message) return
    if (playable.length > 0) {
      playAt(playableFrom(messageIndex))
    } else {
      onSeekMessage?.(message.id)
    }
  }

  function handleWaveClick(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    const ratio = Math.min(0.999, Math.max(0, (event.clientX - rect.left) / rect.width))
    jumpTo(Math.floor(ratio * total))
  }

  const hasClips = clipIds !== ''
  const ready = playable.length > 0

  return (
    <div className="training-ai__session-player">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="auto" onEnded={handleEnded} onTimeUpdate={handleTimeUpdate} onPause={() => setPlaying(false)} />

      <div className="training-ai__session-player-toolbar">
        {hasClips ? (
          <button
            type="button"
            className="imp-btn imp-btn--ghost training-ai__session-player-play"
            onClick={toggle}
            disabled={!ready}
            aria-label={playing ? 'Pausar a ligação' : 'Ouvir a ligação'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
        ) : null}
        <div className="training-ai__session-player-meta">
          <strong>
            {ready
              ? `Fala ${currentIndex + 1} de ${messages.length}${clock.at ? ` · ${formatPlayhead(clock.at)}${clock.length ? ` / ${formatPlayhead(clock.length)}` : ''}` : ''}`
              : `${messages.length} falas`}
          </strong>
          <span className="training-ai__meta">
            {loading
              ? 'Carregando a gravação…'
              : failed
                ? 'Não foi possível carregar a gravação. Tente recarregar a página.'
                : ready
                  ? 'Gravação da ligação, fala por fala'
                  : legacyAudioUrl
                    ? 'Gravação do microfone'
                    : 'Esta simulação não tem gravação de áudio. As ligações por voz feitas a partir de agora ficam gravadas.'}
          </span>
        </div>
      </div>

      {!hasClips && legacyAudioUrl ? (
        <audio controls src={legacyAudioUrl} style={{ width: '100%' }}>
          <a href={legacyAudioUrl} download>
            Baixar gravação
          </a>
        </audio>
      ) : null}

      <div
        className="training-ai__waveform"
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={messages.length}
        aria-valuenow={currentIndex + 1}
        aria-label="Linha do tempo da ligação"
        onClick={handleWaveClick}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') jumpTo(Math.min(messages.length - 1, currentIndex + 1))
          else if (event.key === 'ArrowLeft') jumpTo(Math.max(0, currentIndex - 1))
          else if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault()
            toggle()
          }
        }}
      >
        <div className="training-ai__waveform-progress" style={{ width: `${progressPct}%` }} aria-hidden="true" />
        <div className="training-ai__waveform-markers">
          {messages.map((message, index) => {
            const sentiment = estimateMessageSentiment(message)
            return (
              <button
                key={message.id}
                type="button"
                className={`training-ai__waveform-marker training-ai__waveform-marker--${sentiment.tone} ${
                  activeMessageId === message.id ? 'is-active' : ''
                }`}
                style={{ left: `${((index + 0.5) / total) * 100}%` }}
                title={`${message.role === 'ai' ? 'Persona' : 'Vendedor'} · ${sentiment.label}`}
                onClick={(event) => {
                  event.stopPropagation()
                  jumpTo(index)
                }}
              />
            )
          })}
        </div>
      </div>

      <ul className="training-ai__sentiment-legend" aria-label="Sentimento estimado por fala">
        <li>
          <span className="training-ai__sentiment-dot training-ai__sentiment-dot--green" /> Positivo
        </li>
        <li>
          <span className="training-ai__sentiment-dot training-ai__sentiment-dot--blue" /> Curioso
        </li>
        <li>
          <span className="training-ai__sentiment-dot training-ai__sentiment-dot--amber" /> Tensão
        </li>
        <li>
          <span className="training-ai__sentiment-dot training-ai__sentiment-dot--muted" /> Neutro
        </li>
      </ul>
    </div>
  )
}
