import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import { PLATFORM_API_BASE } from '../../../core/api/platformClient.js'
import { trainingApi } from '../services/api/client.js'
import SectionRadar from '../components/SectionRadar.jsx'
import SessionAudioPlayer from '../components/SessionAudioPlayer.jsx'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { estimateSessionMetrics } from '../utils/agentDisplay.js'
import { estimateMessageSentiment } from '../utils/voiceSession.js'

function formatClock(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

const JUDGE_LABELS = {
  openai: 'IA',
  'openai+rules': 'IA com regras do playbook',
  rules: 'regras do playbook',
}

export default function TrainingReportPage() {
  const { scenarioId, sessionId } = useParams()
  const {
    evaluation,
    history,
    canReport,
    resetSimulation,
    showConversation,
    setShowConversation,
    loadReport,
  } = useTrainingAi()

  const [activeMessageId, setActiveMessageId] = useState(null)
  const [loaded, setLoaded] = useState({ id: null, report: null, error: '' })
  const [tab, setTab] = useState('resultados')
  const [audioUrl, setAudioUrl] = useState('')
  const [rejudging, setRejudging] = useState(false)

  // /relatorio/sessao/:id opens that session; /relatorio/:scenarioId opens the latest one for the scenario.
  const targetId =
    sessionId ||
    (evaluation?.scenarioId === scenarioId ? evaluation.sessionId : null) ||
    history.find((item) => item.scenarioId === scenarioId)?.sessionId ||
    null
  const justFinished = evaluation?.sessionId === targetId ? evaluation : null

  useEffect(() => {
    if (!targetId || justFinished || !canReport) return undefined
    let cancelled = false
    loadReport(targetId).then((result) => {
      if (!cancelled) setLoaded({ id: targetId, report: result.report || null, error: result.error || '' })
    })
    return () => {
      cancelled = true
    }
  }, [targetId, justFinished, canReport, loadReport])

  const report = (loaded.id === targetId ? loaded.report : null) || justFinished
  const loading = Boolean(targetId) && !report && loaded.id !== targetId
  const loadError = loaded.id === targetId ? loaded.error : ''

  const handleSeekMessage = useCallback(
    (messageId) => {
      if (!messageId) return
      setActiveMessageId(messageId)
      setShowConversation(true)
      window.requestAnimationFrame(() => {
        const node = document.getElementById(`msg-${messageId}`)
        node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    [setShowConversation],
  )

  useEffect(() => {
    if (!report?.hasAudio || !report.sessionId) return undefined
    let objectUrl = ''
    let cancelled = false
    fetch(`${PLATFORM_API_BASE}/api/modules/training-ai/sessions/${report.sessionId}/audio`, {
      credentials: 'include',
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setAudioUrl(objectUrl)
      })
      .catch(() => null)
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [report?.hasAudio, report?.sessionId])

  if (!canReport) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Você não tem acesso à Central de Insights.</p>
        </div>
      </TrainingPage>
    )
  }

  if (loading) {
    return (
      <TrainingPage>
        <p>Carregando análise…</p>
      </TrainingPage>
    )
  }

  if (!report) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Análise indisponível</h3>
          <p>{loadError || 'Não encontramos um relatório para esta sessão.'}</p>
          <div className="imp-actions">
            <Link to="/modules/training-ai/historico" className="imp-btn imp-btn--primary">
              Voltar aos insights
            </Link>
          </div>
        </div>
      </TrainingPage>
    )
  }

  const band = report.band || { label: '—', tone: 'muted' }
  const communication = report.communication
  const redoTo = report.scenarioId
    ? `/modules/training-ai/simulacao/${report.scenarioId}`
    : `/modules/training-ai/simulacao/persona/${report.personaId}`
  const metrics = estimateSessionMetrics(report)
  const feedback = report.coachFeedback || []
  const nextSteps = report.nextSteps || []
  const mediaLabel = report.mediaMode === 'voice' ? 'Voz' : 'Texto'
  const judgeLabel = JUDGE_LABELS[report.judgeSource] || null

  return (
    <TrainingPage>
      <header className="training-ai__page-header">
        <div>
          <h2>Central de Insights · Análise</h2>
          <p>
            {report.scenarioTitle} · Agente {report.personaName} ·{' '}
            {new Date(report.completedAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="training-ai__page-header-actions">
          <span className={`imp-pill imp-pill--${band.tone}`}>Concluída</span>
          <Link
            to="/modules/training-ai/historico"
            className="imp-btn imp-btn--ghost"
            onClick={resetSimulation}
          >
            ← Insights
          </Link>
          <button
            type="button"
            className="imp-btn imp-btn--ghost"
            onClick={() => setShowConversation((value) => !value)}
          >
            {showConversation ? 'Ocultar transcrição' : 'Ver conversa'}
          </button>
          <button
            type="button"
            className="imp-btn imp-btn--ghost"
            disabled={rejudging}
            onClick={async () => {
              if (!report.sessionId) return
              setRejudging(true)
              try {
                const stored = await trainingApi.rejudgeSession(report.sessionId)
                setLoaded({ id: report.sessionId, report: stored.report, error: '' })
              } finally {
                setRejudging(false)
              }
            }}
          >
            {rejudging ? 'Gerando…' : 'Novo feedback'}
          </button>
          <Link to={redoTo} className="imp-btn imp-btn--primary" onClick={resetSimulation}>
            Refazer simulação
          </Link>
        </div>
      </header>

      <div className="training-ai__report-hero">
        <div className="training-ai__report-hero-main">
          <h2>{report.scenarioTitle}</h2>
          <p>
            Agente: {report.personaName} · Playbook: {report.templateTitle} · {mediaLabel}
            {judgeLabel ? ` · Avaliação: ${judgeLabel}` : ''}
          </p>
        </div>
        <div className="training-ai__report-score">
          <strong>{report.score}</strong>
          <span className={`imp-pill imp-pill--${band.tone}`}>{band.label}</span>
          <span className="training-ai__meta">Score final / 100</span>
        </div>
      </div>

      <div className="training-ai__tabs">
        {[
          ['resultados', 'Resultados'],
          ['comunicacao', 'Métricas de comunicação'],
          ['template', report.templateTitle || 'Template'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`imp-btn ${tab === id ? 'imp-btn--primary' : 'imp-btn--ghost'}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'resultados' ? (
        <div className="imp-panel">
          {report.sellerInstructions ? <p>{report.sellerInstructions}</p> : null}
          <h3>Pontos positivos</h3>
          <ul className="training-ai__list">{(report.positives || report.strengths || []).map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Pontos negativos</h3>
          <ul className="training-ai__list">{(report.negatives || []).map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Sugestões de melhoria</h3>
          <ul className="training-ai__list">{(report.suggestions || report.improvements || []).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}

      {tab === 'comunicacao' ? (
        <div className="imp-panel">
          {audioUrl ? (
            <audio controls src={audioUrl}>
              <a href={audioUrl} download>Baixar gravação</a>
            </audio>
          ) : (
            <p className="training-ai__meta">Sem arquivo de áudio. As métricas usam o tempo de cada fala.</p>
          )}
          <ul className="training-ai__metric-checks">
            <li>
              <span>Fala / escuta</span>
              <strong>{communication?.talkListenPct ?? metrics.talkShare}% <span className="training-ai__meta">{communication?.talkListenStatus} · ideal {communication?.talkListenIdeal || '40–50%'}</span></strong>
            </li>
            <li>
              <span>Palavras por minuto</span>
              <strong>{communication?.wordsPerMinute ?? '—'} <span className="training-ai__meta">{communication?.wordsPerMinuteStatus} · ideal {communication?.wordsPerMinuteIdeal || '110–150'}</span></strong>
            </li>
            <li>
              <span>Maior monólogo</span>
              <strong>{communication?.longestMonologueSec ?? '—'}s <span className="training-ai__meta">{communication?.longestMonologueStatus} · ideal {communication?.longestMonologueIdeal || '60–150s'}</span></strong>
            </li>
            <li>
              <span>Vícios de linguagem</span>
              <strong>{communication?.fillersPerMinute ?? '—'} /min <span className="training-ai__meta">{communication?.fillersStatus} · {communication?.fillersIdeal || 'menos de 2'}</span></strong>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="imp-panel training-ai__session-player-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Linha do tempo</h2>
            <p>
              Uma marca por fala, no horário real da conversa. O sentimento é estimado por
              palavras-chave.
            </p>
          </div>
        </div>
        <SessionAudioPlayer
          messages={report.messages || []}
          activeMessageId={activeMessageId}
          onSeekMessage={handleSeekMessage}
        />
      </div>

      <div className="training-ai__insights-split" hidden={tab !== 'template'}>
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Transcrição</h2>
              <p>Diálogo com sentimento estimado por fala · clique numa marca da linha do tempo para ir até ela.</p>
            </div>
          </div>
          {showConversation ? (
            <div className="imp-chat training-ai__chat-scroll">
              {(report.messages || []).map((message) => {
                const sentiment = estimateMessageSentiment(message)
                return (
                  <div
                    key={message.id}
                    id={`msg-${message.id}`}
                    className={`imp-chat__bubble imp-chat__bubble--${
                      message.role === 'ai' ? 'ai' : 'user'
                    } ${activeMessageId === message.id ? 'is-player-active' : ''}`}
                  >
                    <span className="imp-chat__meta">
                      {message.speaker ||
                        (message.role === 'ai' ? report.personaName : 'Vendedor')}
                      {message.timestamp ? ` · ${formatClock(message.timestamp)}` : ''}
                      <span
                        className={`training-ai__sentiment-chip training-ai__sentiment-chip--${sentiment.tone}`}
                      >
                        {sentiment.label}
                      </span>
                    </span>
                    {message.text}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="training-ai__empty">
              <h3>Transcrição oculta</h3>
              <p>Use “Ver conversa” ou as marcas da linha do tempo para abrir o diálogo.</p>
            </div>
          )}

          {feedback.length ? (
            <div className="training-ai__rubric training-ai__rubric--spaced">
              <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-h)', fontSize: '0.95rem' }}>
                Coaching com âncora na fala
              </h3>
              <ul className="training-ai__list">
                {feedback.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong> — {item.detail}
                    {item.messageText ? (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="training-ai__linkish"
                          onClick={() => handleSeekMessage(item.messageId)}
                        >
                          Ver fala · {formatClock(item.timestamp)}
                        </button>
                        <div className="training-ai__meta">“{item.messageText}”</div>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="training-ai__rubric training-ai__rubric--spaced">
            <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-h)', fontSize: '0.95rem' }}>
              Critérios do playbook
            </h3>
            {(report.sections || []).map((section) => (
              <div key={section.id} className="training-ai__rubric-section">
                <div className="training-ai__rubric-section-head">
                  <h3>{section.name}</h3>
                  <span>
                    {section.passedCount}/{section.totalCount} · {section.earnedWeight}/
                    {section.totalWeight} pts
                  </span>
                </div>
                {section.criteria.map((criterion) => (
                  <div key={criterion.id} className="training-ai__criterion">
                    <span
                      className={`training-ai__criterion-mark ${
                        criterion.passed ? 'is-pass' : 'is-fail'
                      }`}
                    >
                      {criterion.passed ? '✓' : '✗'}
                    </span>
                    <div className="training-ai__criterion-body">
                      <strong>{criterion.name}</strong>
                      <p>{criterion.yesNoQuestion}</p>
                      {criterion.rationale ? (
                        <p className="training-ai__meta">{criterion.rationale}</p>
                      ) : null}
                    </div>
                    <span className="training-ai__criterion-weight">{criterion.weight}%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="training-ai__insights-side">
          <div className="imp-panel">
            <div className="imp-panel__header">
              <div>
                <h2>Performance de venda</h2>
                <p>Radar pelas etapas do playbook</p>
              </div>
            </div>
            <SectionRadar sections={report.sections || []} />
          </div>

          <div className="imp-panel">
            <div className="imp-panel__header">
              <div>
                <h2>Principais métricas</h2>
                <p>Calculadas a partir da transcrição</p>
              </div>
            </div>
            <ul className="training-ai__metric-checks">
              <li>
                <span>Duração estimada</span>
                <strong>
                  {metrics.durationLabel}
                  <span className="training-ai__meta"> · {metrics.ideal.duration}</span>
                </strong>
              </li>
              <li>
                <span>Share de fala (est.)</span>
                <strong>
                  {metrics.talkShare}%
                  <span className="training-ai__meta"> · {metrics.ideal.talkShare}</span>
                </strong>
              </li>
              <li>
                <span>Interrupções</span>
                <strong>
                  —<span className="training-ai__meta"> · Não medido (requer áudio)</span>
                </strong>
              </li>
              <li>
                <span>Mensagens (você)</span>
                <strong>
                  {metrics.userMessageCount}/{metrics.messageCount}
                </strong>
              </li>
              <li>
                <span>Perguntas detectadas</span>
                <strong>
                  {metrics.questionHints}
                  <span className="training-ai__meta"> · {metrics.ideal.questions}</span>
                </strong>
              </li>
            </ul>
          </div>

          <div className="imp-panel training-ai__insight-panel training-ai__insight-panel--strong">
            <div className="imp-panel__header">
              <div>
                <h2>Pontos fortes</h2>
              </div>
            </div>
            <ul className="training-ai__list">
              {(report.strengths || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="imp-panel training-ai__insight-panel training-ai__insight-panel--improve">
            <div className="imp-panel__header">
              <div>
                <h2>Pontos de melhoria</h2>
              </div>
            </div>
            <ul className="training-ai__list training-ai__list--muted">
              {(report.improvements || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="training-ai__coach">{report.coachNotes}</p>
          </div>

          <div className="imp-panel">
            <div className="imp-panel__header">
              <div>
                <h2>Próximos passos sugeridos</h2>
              </div>
            </div>
            <ul className="training-ai__list">
              {nextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </TrainingPage>
  )
}
