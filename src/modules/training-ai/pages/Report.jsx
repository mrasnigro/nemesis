import { Link, useParams } from 'react-router-dom'
import SectionRadar from '../components/SectionRadar.jsx'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { estimateSessionMetrics } from '../utils/agentDisplay.js'

export default function TrainingReportPage() {
  const { scenarioId } = useParams()
  const {
    evaluation,
    history,
    canReport,
    resetSimulation,
    showConversation,
    setShowConversation,
  } = useTrainingAi()

  const report =
    (evaluation?.scenarioId === scenarioId && evaluation) ||
    history.find((item) => item.scenarioId === scenarioId) ||
    null

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
          <p>Não há relatório para este cenário na sessão atual.</p>
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
  const nextSteps =
    report.improvements?.length > 0
      ? [
          `Refazer o cenário focando em: ${report.improvements[0]}`,
          'Revisar o playbook vinculado e as perguntas sim/não que falharam.',
        ]
      : ['Manter a prática com um agente de dificuldade maior.']

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Central de Insights · Análise</h2>
          <p>
            {report.scenarioTitle} · {report.personaName} ·{' '}
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
            {showConversation ? 'Ocultar transcrição' : 'Ver transcrição'}
          </button>
          <Link
            to={`/modules/training-ai/simulacao/${scenarioId}`}
            className="imp-btn imp-btn--primary"
            onClick={resetSimulation}
          >
            Refazer
          </Link>
        </div>
      </header>

      <div className="training-ai__report-hero">
        <div className="training-ai__report-hero-main">
          <h2>{report.scenarioTitle}</h2>
          <p>
            Agente: {report.personaName} · Playbook: {report.templateTitle} · Conversa por texto
          </p>
        </div>
        <div className="training-ai__report-score">
          <strong>{report.score}</strong>
          <span className={`imp-pill imp-pill--${band.tone}`}>{band.label}</span>
          <span className="training-ai__meta">Score final / 100</span>
        </div>
      </div>

      <div className="training-ai__insights-split">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Transcrição</h2>
              <p>Diálogo da simulação com timestamps.</p>
            </div>
          </div>
          {showConversation ? (
            <div className="imp-chat training-ai__chat-scroll">
              {(report.messages || []).map((message) => (
                <div
                  key={message.id}
                  className={`imp-chat__bubble imp-chat__bubble--${
                    message.role === 'ai' ? 'ai' : 'user'
                  }`}
                >
                  <span className="imp-chat__meta">
                    {message.speaker ||
                      (message.role === 'ai' ? report.personaName : 'Vendedor')}
                    {message.timestamp
                      ? ` · ${new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}`
                      : ''}
                  </span>
                  {message.text}
                </div>
              ))}
            </div>
          ) : (
            <div className="training-ai__empty">
              <h3>Transcrição oculta</h3>
              <p>Use “Ver transcrição” para revisar o diálogo completo.</p>
            </div>
          )}

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
                <p>Derivadas da conversa por texto</p>
              </div>
            </div>
            <ul className="training-ai__metric-checks">
              <li>
                <span>Duração estimada</span>
                <strong>{metrics.durationLabel}</strong>
              </li>
              <li>
                <span>Mensagens (você)</span>
                <strong>
                  {metrics.userMessageCount}/{metrics.messageCount}
                </strong>
              </li>
              <li>
                <span>Share de fala (estimado)</span>
                <strong>{metrics.talkShare}%</strong>
              </li>
              <li>
                <span>Perguntas detectadas</span>
                <strong>{metrics.questionHints}</strong>
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
