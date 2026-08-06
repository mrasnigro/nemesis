import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

export default function TrainingReportPage() {
  const { scenarioId, sessionId } = useParams()
  const {
    evaluation,
    history,
    canReport,
    resetSimulation,
    showConversation,
    setShowConversation,
  } = useTrainingAi()

  const [activeMessageId, setActiveMessageId] = useState(null)

  const report =
    (sessionId &&
      ((evaluation?.sessionId === sessionId && evaluation) ||
        history.find((item) => item.sessionId === sessionId))) ||
    (scenarioId &&
      ((evaluation?.scenarioId === scenarioId && evaluation) ||
        history.find((item) => item.scenarioId === scenarioId))) ||
    null

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

  if (!canReport) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Você não tem acesso à Central de Insights.</p>
        </div>
      </section>
    )
  }

  if (!report) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Análise indisponível</h3>
          <p>Não há relatório para esta sessão na navegação atual.</p>
          <div className="imp-actions">
            <Link to="/modules/training-ai/historico" className="imp-btn imp-btn--primary">
              Voltar aos insights
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const band = report.band || { label: '—', tone: 'muted' }
  const metrics = estimateSessionMetrics(report)
  const redoScenarioId = report.scenarioId
  const feedback = report.coachFeedback || []
  const nextSteps = report.nextSteps || []
  const mediaLabel = report.mediaMode === 'voice' ? 'Voz (stub UI)' : 'Texto'

  return (
    <section className="imp-module">
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
          <Link
            to={`/modules/training-ai/simulacao/${redoScenarioId}`}
            className="imp-btn imp-btn--primary"
            onClick={resetSimulation}
          >
            Refazer simulação
          </Link>
        </div>
      </header>

      <div className="training-ai__report-hero">
        <div className="training-ai__report-hero-main">
          <h2>{report.scenarioTitle}</h2>
          <p>
            Agente: {report.personaName} · Playbook: {report.templateTitle} · {mediaLabel}
            {report.judgeSource ? ` · Judge: ${report.judgeSource}` : ''}
            {report.sessionId ? ` · ${report.sessionId}` : ''}
          </p>
        </div>
        <div className="training-ai__report-score">
          <strong>{report.score}</strong>
          <span className={`imp-pill imp-pill--${band.tone}`}>{band.label}</span>
          <span className="training-ai__meta">Score final / 100</span>
        </div>
      </div>

      <div className="imp-panel training-ai__session-player-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Player da sessão</h2>
            <p>
              Waveform + marcadores de sentimento (composicão do mockup Insights — sem áudio
              real).
            </p>
          </div>
        </div>
        <SessionAudioPlayer
          messages={report.messages || []}
          activeMessageId={activeMessageId}
          onSeekMessage={handleSeekMessage}
        />
      </div>

      <div className="training-ai__insights-split">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Transcrição</h2>
              <p>Diálogo com sentimento por turno · clique no marker do player para âncora.</p>
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
              <p>Use “Ver conversa” ou os marcadores do player para abrir o diálogo.</p>
            </div>
          )}

          {feedback.length ? (
            <div className="training-ai__rubric training-ai__rubric--spaced">
              <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-h)', fontSize: '0.95rem' }}>
                Coaching com âncora na fala (vídeo)
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
                <p>Texto derivado · Ideal do mockup Insights</p>
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
                  —<span className="training-ai__meta"> · Ideal: &lt; 3 (requer áudio)</span>
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
  )
}
