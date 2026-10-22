import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import AgentAvatar from '../components/AgentAvatar.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import { PLATFORM_API_BASE } from '../../../core/api/platformClient.js'
import { trainingApi } from '../services/api/client.js'
import SectionRadar from '../components/SectionRadar.jsx'
import SessionAudioPlayer from '../components/SessionAudioPlayer.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { scenarioTypeLabel } from '../data/personas.js'
import { estimateSessionMetrics } from '../utils/agentDisplay.js'
import { formatDuration } from '../utils/dates.js'
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

function formatWhen(iso) {
  if (!iso) return ''
  try {
    return new Date(iso)
      .toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace(',', ' às')
  } catch {
    return ''
  }
}

function scoreTone(score) {
  const value = Number(score)
  if (!Number.isFinite(value) || value <= 0) return 'muted'
  if (value >= 70) return 'green'
  if (value >= 40) return 'amber'
  return 'rose'
}

export default function TrainingReportPage() {
  const navigate = useNavigate()
  const { scenarioId, sessionId } = useParams()
  const {
    evaluation,
    history,
    canReport,
    getPersona,
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
  const [rejudgeError, setRejudgeError] = useState('')
  const [confirmDeleteAudio, setConfirmDeleteAudio] = useState(false)
  const [deletingAudio, setDeletingAudio] = useState(false)
  const [audioDeleteError, setAudioDeleteError] = useState('')

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
          <p>Você não tem acesso ao histórico.</p>
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
              Histórico de Simulações
            </Link>
          </div>
        </div>
      </TrainingPage>
    )
  }

  const communication = report.communication
  const redoTo = report.scenarioId
    ? `/modules/training-ai/simulacao/${report.scenarioId}`
    : `/modules/training-ai/simulacao/persona/${report.personaId}`
  const metrics = estimateSessionMetrics(report)
  const feedback = report.coachFeedback || []
  const nextSteps = report.nextSteps || []
  const persona = report.personaId ? getPersona(report.personaId) : null
  const positives = report.positives || report.strengths || []
  const negatives = report.negatives || []
  const suggestions = report.suggestions || report.improvements || []
  const hasScore = report.score !== null && report.score !== undefined && Number.isFinite(Number(report.score))
  const scoreValue = hasScore ? Math.round(Number(report.score)) : null
  const hasRecording =
    Boolean(report.hasAudio) || (Array.isArray(report.messages) && report.messages.some((message) => message.hasAudio))
  const criteriaList = Array.isArray(report.criteria) ? report.criteria : []
  const criteriaTotal = criteriaList.length
  const criteriaPassed = criteriaList.filter((item) => item.passed).length
  // The score is the weight of the criteria met, out of the weight of the whole playbook (normally 100).
  const scoreMax = Math.max(100, Math.round(criteriaList.reduce((sum, item) => sum + (Number(item.weight) || 0), 0)))
  const durationLabel = formatDuration(
    report.durationMs || (communication?.durationSec ? communication.durationSec * 1000 : 0),
  )
  const roleLine =
    persona?.role && persona?.company
      ? `${persona.role} em ${persona.company}`
      : persona?.role || persona?.company || '—'
  const scenarioLabel = persona?.scenarioType ? scenarioTypeLabel(persona.scenarioType) : report.scenarioTitle
  const sessionIndex = history.findIndex((item) => item.id === report.sessionId)
  const previousSession = sessionIndex > 0 ? history[sessionIndex - 1] : null
  const nextSession = sessionIndex >= 0 && sessionIndex < history.length - 1 ? history[sessionIndex + 1] : null

  async function handleRejudge() {
    if (!report.sessionId || rejudging) return
    setRejudging(true)
    setRejudgeError('')
    try {
      const stored = await trainingApi.rejudgeSession(report.sessionId)
      setLoaded({
        id: report.sessionId,
        report: {
          ...stored.report,
          score: stored.report?.score ?? stored.score ?? report.score,
          durationMs: stored.durationMs ?? report.durationMs,
          hasAudio: report.hasAudio,
          completedAt: stored.report?.completedAt || stored.completedAt || report.completedAt,
        },
        error: '',
      })
    } catch (error) {
      setRejudgeError(error?.message || 'Não foi possível gerar um novo feedback.')
    } finally {
      setRejudging(false)
    }
  }

  async function handleDeleteAudio() {
    if (!report.sessionId || deletingAudio) return
    setDeletingAudio(true)
    setAudioDeleteError('')
    try {
      await trainingApi.deleteSessionAudio(report.sessionId)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl('')
      setLoaded({
        id: report.sessionId,
        report: {
          ...report,
          hasAudio: false,
          messages: (report.messages || []).map(({ hasAudio: _hasAudio, ...message }) => message),
        },
        error: '',
      })
      setConfirmDeleteAudio(false)
    } catch (error) {
      setAudioDeleteError(error?.message || 'Não foi possível apagar a gravação.')
    } finally {
      setDeletingAudio(false)
    }
  }

  return (
    <TrainingPage className="training-ai__sim-report">
      <header className="training-ai__page-header">
        <div className="training-ai__page-title-row">
          <OutlineIcon name="history" />
          <h2>Relatório de Simulação</h2>
        </div>
        <div className="training-ai__page-header-actions">
          <Link to="/modules/training-ai/historico" className="imp-btn imp-btn--primary" onClick={resetSimulation}>
            <OutlineIcon name="history" />
            Histórico de Simulações
          </Link>
        </div>
      </header>

      {report.judgeSource === 'builtin' ||
      report.judgeSource === 'rules' ||
      report.judgeSource === 'openai+rules' ? (
        <p className="training-ai__composer-hint" role="status">
          {report.judgeSource === 'builtin'
            ? 'Esta simulação foi avaliada pelo provedor interno de regras. A nota considera as palavras-chave do playbook, não uma análise contextual da conversa.'
            : 'Esta nota usou palavras-chave do playbook para os critérios sem avaliação contextual da IA. Use “Novo feedback” no fim da página para avaliar a conversa de novo.'}
        </p>
      ) : null}
      {report.mediaMode === 'voice' && !hasRecording ? (
        <p className="training-ai__composer-hint" role="status">
          A transcrição foi salva, mas não há gravação de áudio disponível para esta simulação.
        </p>
      ) : null}

      <section
        className={`imp-panel training-ai__score-hero training-ai__score-hero--${scoreTone(report.score)}`}
        aria-label="Pontuação da ligação"
      >
        <div className="training-ai__score-hero-value">
          <strong>{scoreValue ?? '—'}</strong>
          <span>/ {scoreMax}</span>
        </div>
        <div className="training-ai__score-hero-text">
          <b>{report.band?.label || 'Resultado'}</b>
          <span>
            Pontuação da ligação
            {criteriaTotal ? ` · ${criteriaPassed} de ${criteriaTotal} critérios atendidos` : ''}
          </span>
        </div>
      </section>

      <section className="imp-panel training-ai__sim-report-card">
        <div className="training-ai__sim-report-top">
          <div>
            <h3>{report.personaName}</h3>
            <p>{formatWhen(report.completedAt)}</p>
          </div>
          <div className="training-ai__sim-report-tabs" role="tablist">
            {[
              ['resultados', 'Resultados'],
              ['comunicacao', 'Métricas de Comunicação'],
              ['template', report.templateTitle || 'Template'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'is-selected' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'resultados' ? (
          <div className="training-ai__sim-report-grid">
            <div className="training-ai__sim-report-side">
              <div className="training-ai__sim-report-stats">
                <article>
                  <span>Tempo de Negociação</span>
                  <strong>{durationLabel}</strong>
                </article>
                <article>
                  <span>Desempenho</span>
                  <b className={`training-ai__score-badge training-ai__score-badge--lg training-ai__score-badge--${scoreTone(report.score)}`}>
                    {scoreValue ?? '—'}
                  </b>
                </article>
              </div>
              <div className="training-ai__sim-report-persona">
                <AgentAvatar
                  id={report.personaId || report.personaName}
                  name={report.personaName}
                  size="md"
                  photo={persona?.avatarData}
                />
                <div>
                  <strong>{report.personaName}</strong>
                  <span>{persona?.location || '—'}</span>
                </div>
              </div>
              <div className="training-ai__sim-report-instructions">
                <span>
                  <OutlineIcon name="star" size={14} />
                  Instruções ao Vendedor
                </span>
                <p>{report.sellerInstructions || persona?.sellerInstructions || '—'}</p>
              </div>
              <dl className="training-ai__sim-report-fields">
                <div>
                  <dt>Negociador</dt>
                  <dd>{report.negotiatorType || persona?.negotiatorType || '—'}</dd>
                </div>
                <div>
                  <dt>Cargo &amp; Empresa</dt>
                  <dd>{roleLine}</dd>
                </div>
                <div>
                  <dt>Cenário da Simulação</dt>
                  <dd>{scenarioLabel || '—'}</dd>
                </div>
              </dl>
            </div>
            <div className="training-ai__sim-report-feedback">
              <article>
                <h4>Pontos Positivos</h4>
                {positives.length ? (
                  <ul>{positives.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : (
                  <p>Nenhum ponto positivo registrado.</p>
                )}
              </article>
              <article>
                <h4>Pontos Negativos</h4>
                {negatives.length ? (
                  <ul>{negatives.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : (
                  <p>Nenhum ponto negativo registrado.</p>
                )}
              </article>
              <article>
                <h4>Sugestões de Melhoria</h4>
                {suggestions.length ? (
                  <ul>{suggestions.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : (
                  <p>Nenhuma sugestão registrada.</p>
                )}
              </article>
            </div>
          </div>
        ) : null}

      {tab === 'comunicacao' ? (
        <div className="imp-panel">
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

      {(tab === 'comunicacao' || showConversation) ? (
      <div className="imp-panel training-ai__session-player-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Linha do tempo</h2>
            <p>
              Uma marca por fala, no horário real da conversa. O sentimento é estimado por
              palavras-chave.
            </p>
          </div>
          {hasRecording && report.canDeleteAudio !== false ? (
            <button
              type="button"
              className="imp-btn imp-btn--ghost"
              onClick={() => setConfirmDeleteAudio(true)}
              disabled={deletingAudio}
            >
              Apagar gravação
            </button>
          ) : null}
        </div>
        {audioDeleteError ? <p className="training-ai__composer-hint" role="alert">{audioDeleteError}</p> : null}
        <SessionAudioPlayer
          sessionId={report.sessionId}
          messages={report.messages || []}
          legacyAudioUrl={audioUrl}
          activeMessageId={activeMessageId}
          onSeekMessage={handleSeekMessage}
        />
      </div>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteAudio}
        title="Apagar gravação?"
        message="O áudio desta simulação será removido permanentemente. A transcrição e a avaliação serão mantidas."
        cancelLabel="Cancelar"
        confirmLabel={deletingAudio ? 'Apagando…' : 'Apagar gravação'}
        onCancel={() => {
          if (!deletingAudio) setConfirmDeleteAudio(false)
        }}
        onConfirm={() => {
          void handleDeleteAudio()
        }}
      />

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
      </section>

      {showConversation && tab !== 'template' ? (
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Conversa</h2>
              <p>Transcrição da simulação.</p>
            </div>
          </div>
          <div className="imp-chat training-ai__chat-scroll">
            {(report.messages || []).map((message) => {
              const sentiment = estimateMessageSentiment(message)
              return (
                <div
                  key={message.id}
                  id={`msg-${message.id}`}
                  className={`imp-chat__bubble imp-chat__bubble--${message.role === 'ai' ? 'ai' : 'user'} ${activeMessageId === message.id ? 'is-player-active' : ''}`}
                >
                  <span className="imp-chat__meta">
                    {message.speaker || (message.role === 'ai' ? report.personaName : 'Vendedor')}
                    {message.timestamp ? ` · ${formatClock(message.timestamp)}` : ''}
                    <span className={`training-ai__sentiment-chip training-ai__sentiment-chip--${sentiment.tone}`}>
                      {sentiment.label}
                    </span>
                  </span>
                  {message.text}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <footer className="training-ai__sim-report-footer">
        <div className="training-ai__sim-report-footer-start">
          <button type="button" className="imp-btn imp-btn--ghost" onClick={() => setShowConversation((value) => !value)}>
            <OutlineIcon name="chat" />
            {showConversation ? 'Ocultar conversa' : 'Ver conversa'}
          </button>
          <Link to={redoTo} className="imp-btn imp-btn--ghost" onClick={resetSimulation}>
            <OutlineIcon name="redo" />
            Refazer simulação
          </Link>
        </div>
        <div className="training-ai__sim-report-footer-end">
          {rejudgeError ? (
            <span className="training-ai__composer-hint" role="alert">
              {rejudgeError}
            </span>
          ) : null}
          <button type="button" className="imp-btn imp-btn--primary" disabled={rejudging} onClick={handleRejudge}>
            {rejudging ? 'Gerando…' : 'Novo feedback'}
          </button>
          <button
            type="button"
            className="imp-btn imp-btn--ghost training-ai__btn--icon"
            aria-label="Simulação anterior"
            disabled={!previousSession}
            onClick={() => previousSession && navigate(`/modules/training-ai/relatorio/sessao/${previousSession.id}`)}
          >
            ‹
          </button>
          <button
            type="button"
            className="imp-btn imp-btn--ghost training-ai__btn--icon"
            aria-label="Próxima simulação"
            disabled={!nextSession}
            onClick={() => nextSession && navigate(`/modules/training-ai/relatorio/sessao/${nextSession.id}`)}
          >
            ›
          </button>
        </div>
      </footer>
    </TrainingPage>
  )
}
