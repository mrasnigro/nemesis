import { useEffect, useRef, useState } from 'react'
import AgentAvatar from './AgentAvatar.jsx'
import OutlineIcon from './OutlineIcon.jsx'

function DeviceSelect({ icon, value, onChange, options, label }) {
  return (
    <label className="training-ai__call-device">
      <span className="sr-only">{label}</span>
      <OutlineIcon name={icon} size={16} />
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.length === 0 ? <option value="">Dispositivo padrão</option> : null}
        {options.map((item) => (
          <option key={item.deviceId} value={item.deviceId}>
            {item.label || (icon === 'mic' ? 'Microfone' : 'Alto-falante')}
          </option>
        ))}
      </select>
      <OutlineIcon name="chevronDown" size={16} className="training-ai__call-device-chevron" />
    </label>
  )
}

function PersonaHero({ persona, overlay = null }) {
  return (
    <div className="training-ai__call-hero">
      {persona?.avatarData ? (
        <img src={persona.avatarData} alt="" className="training-ai__call-hero-photo" />
      ) : (
        <div className="training-ai__call-hero-fallback">
          <AgentAvatar id={persona?.id} name={persona?.name} size="xl" photo={persona?.avatarData} />
          <strong>{persona?.name}</strong>
          <span>
            {persona?.role}
            {persona?.company ? ` · ${persona.company}` : ''}
          </span>
        </div>
      )}
      {overlay}
    </div>
  )
}

function TestPlayback({ url, durationLabel }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setPlaying(false)
    setProgress(0)
  }, [url])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio || !url) return
    if (audio.paused) {
      audio.play().catch(() => null)
      setPlaying(true)
    } else {
      audio.pause()
      setPlaying(false)
    }
  }

  return (
    <div className="training-ai__mic-playback">
      <div className="training-ai__mic-playback-head">
        <span>Sua gravação de teste</span>
        <span>{durationLabel}</span>
      </div>
      <div className="training-ai__mic-playback-track">
        <div className="training-ai__mic-playback-bar" style={{ width: `${progress * 100}%` }} />
        <button
          type="button"
          className="training-ai__mic-playback-play"
          aria-label={playing ? 'Pausar' : 'Reproduzir'}
          onClick={togglePlay}
          disabled={!url}
        >
          <OutlineIcon name="play" size={18} />
        </button>
      </div>
      {url ? (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onTimeUpdate={(event) => {
            const el = event.currentTarget
            setProgress(el.duration ? el.currentTime / el.duration : 0)
          }}
          onEnded={() => {
            setPlaying(false)
            setProgress(0)
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * Ligação preflight: mic setup → live test → review (Vendiq call-entry screens).
 */
export default function CallPreflight({
  persona,
  step,
  mic,
  onStepChange,
  onStartSimulation,
  starting = false,
}) {
  const {
    mics,
    speakers,
    micId,
    speakerId,
    setMicId,
    setSpeakerId,
    level,
    recording,
    testUrl,
    testBlob,
    testDurationLabel,
    error,
    startTest,
    stopTest,
    cancelTest,
    clearTest,
  } = mic

  const wasRecordingRef = useRef(false)

  useEffect(() => {
    if (recording) wasRecordingRef.current = true
    else if (wasRecordingRef.current && step === 'testing') {
      wasRecordingRef.current = false
      onStepChange(testBlob || testUrl ? 'review' : 'setup')
    }
  }, [recording, step, testBlob, testUrl, onStepChange])

  useEffect(() => {
    if (step !== 'testing' || !recording) return undefined
    const timer = window.setTimeout(() => stopTest(), 8000)
    return () => window.clearTimeout(timer)
  }, [recording, step, stopTest])

  async function handleStartTest() {
    const ok = await startTest()
    if (ok) onStepChange('testing')
  }

  function handleCancelTest() {
    cancelTest()
    wasRecordingRef.current = false
    onStepChange('setup')
  }

  function handleRedo() {
    clearTest()
    wasRecordingRef.current = false
    onStepChange('setup')
  }

  const overlay =
    step === 'testing' ? (
      <div className="training-ai__call-hero-controls" aria-label="Controles do teste">
        <button type="button" className="training-ai__call-hero-mic is-on" aria-label="Microfone ativo">
          <OutlineIcon name="mic" size={18} />
        </button>
        <button
          type="button"
          className="training-ai__call-hero-hangup"
          aria-label="Cancelar teste"
          onClick={handleCancelTest}
        >
          <OutlineIcon name="phoneOff" size={18} />
        </button>
      </div>
    ) : null

  return (
    <div className="training-ai__call-preflight">
      <header className="training-ai__call-preflight-head">
        {step === 'review' ? (
          <button type="button" className="training-ai__call-back" aria-label="Voltar" onClick={handleRedo}>
            <OutlineIcon name="chevronLeft" size={18} />
          </button>
        ) : null}
        <OutlineIcon name="phone" size={18} />
        <h2>Simulação</h2>
      </header>

      <div className="training-ai__call-preflight-card">
        <PersonaHero persona={persona} overlay={overlay} />

        <aside className="training-ai__call-preflight-panel">
          {step === 'setup' ? (
            <>
              <h3>Teste seu microfone</h3>
              <p>
                Faça uma gravação rápida para verificar se seu áudio está funcionando corretamente. Esse
                teste não será salvo.
              </p>
              <DeviceSelect icon="mic" label="Microfone" value={micId} onChange={setMicId} options={mics} />
              <DeviceSelect
                icon="volume"
                label="Alto-falante"
                value={speakerId}
                onChange={setSpeakerId}
                options={speakers}
              />
              {error ? <p className="training-ai__composer-hint">{error}</p> : null}
              <div className="training-ai__call-preflight-actions">
                <button
                  type="button"
                  className="training-ai__call-btn training-ai__call-btn--muted"
                  onClick={handleStartTest}
                >
                  Iniciar teste
                </button>
                <button
                  type="button"
                  className="training-ai__call-btn training-ai__call-btn--brand"
                  onClick={onStartSimulation}
                  disabled={starting}
                >
                  {starting ? 'Iniciando…' : 'Iniciar simulação'}
                </button>
              </div>
            </>
          ) : null}

          {step === 'testing' ? (
            <>
              <h3>Teste seu microfone</h3>
              <p>Diga uma frase em voz alta. Por exemplo: &quot;Testando, um, dois, três.&quot;</p>
              <div className="training-ai__mic-level" aria-hidden="true">
                <span className="training-ai__mic-level-track">
                  <span
                    className="training-ai__mic-level-knob"
                    style={{ left: `${Math.max(4, Math.min(96, level * 100))}%` }}
                  />
                </span>
              </div>
              {error ? <p className="training-ai__composer-hint">{error}</p> : null}
              <div className="training-ai__call-preflight-actions training-ai__call-preflight-actions--center">
                <button
                  type="button"
                  className="training-ai__call-btn training-ai__call-btn--muted"
                  onClick={handleCancelTest}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : null}

          {step === 'review' ? (
            <>
              <h3>Teste concluído</h3>
              <p>Confira sua gravação abaixo. Se precisar, refaça o teste antes de continuar.</p>
              <TestPlayback url={testUrl} durationLabel={testDurationLabel} />
              <DeviceSelect icon="mic" label="Microfone" value={micId} onChange={setMicId} options={mics} />
              <DeviceSelect
                icon="volume"
                label="Alto-falante"
                value={speakerId}
                onChange={setSpeakerId}
                options={speakers}
              />
              {error ? <p className="training-ai__composer-hint">{error}</p> : null}
              <div className="training-ai__call-preflight-actions">
                <button
                  type="button"
                  className="training-ai__call-btn training-ai__call-btn--muted"
                  onClick={handleRedo}
                >
                  <OutlineIcon name="redo" size={16} />
                  Refazer teste
                </button>
                <button
                  type="button"
                  className="training-ai__call-btn training-ai__call-btn--brand"
                  onClick={onStartSimulation}
                  disabled={starting}
                >
                  {starting ? 'Iniciando…' : 'Iniciar simulação'}
                </button>
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export function PreparingCallOverlay({ personaName, listening, onToggleMic, onToggleChat, onHangup }) {
  return (
    <div className="training-ai__preparing-stage">
      <header className="training-ai__call-preflight-head">
        <OutlineIcon name="phone" size={18} />
        <h2>Simulação</h2>
      </header>
      <div className="training-ai__preparing-modal" role="status" aria-live="polite">
        <div className="training-ai__preparing-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h3>Preparando sua chamada</h3>
        <p>
          Em instantes, você entrará na chamada com {personaName || 'a persona'}. Estamos estabelecendo a
          conexão.
        </p>
      </div>
      <div className="training-ai__preparing-bar">
        <button
          type="button"
          className={`training-ai__preparing-tool ${listening ? 'is-on' : ''}`}
          aria-label={listening ? 'Silenciar microfone' : 'Ativar microfone'}
          onClick={onToggleMic}
        >
          <OutlineIcon name="mic" size={18} />
        </button>
        <button type="button" className="training-ai__preparing-tool" aria-label="Chat" onClick={onToggleChat}>
          <OutlineIcon name="chat" size={18} />
        </button>
        <button type="button" className="training-ai__preparing-hangup" aria-label="Encerrar" onClick={onHangup}>
          <OutlineIcon name="phoneOff" size={18} />
        </button>
      </div>
    </div>
  )
}

export function LimitExceededModal({ open, onHome }) {
  if (!open) return null
  return (
    <div className="training-ai__limit-modal" role="dialog" aria-modal="true" aria-labelledby="training-ai-limit-title">
      <div className="training-ai__limit-backdrop" />
      <div className="training-ai__limit-panel">
        <span className="training-ai__limit-icon" aria-hidden="true">
          <OutlineIcon name="alert" size={28} />
        </span>
        <h3 id="training-ai-limit-title">Limite excedido</h3>
        <p>Você atingiu o limite do seu plano atual. Entre em contato com o suporte para fazer um upgrade</p>
        <button type="button" className="training-ai__call-btn training-ai__call-btn--muted" onClick={onHome}>
          Página inicial
        </button>
      </div>
    </div>
  )
}
