import { Link, useParams } from 'react-router-dom'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

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
          <p>Você não tem acesso aos relatórios de treinamento.</p>
        </div>
      </section>
    )
  }

  if (!report) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Relatório indisponível</h3>
          <p>Não há avaliação para este cenário na sessão atual.</p>
          <div className="imp-actions">
            <Link to="/modules/training-ai" className="imp-btn imp-btn--primary">
              Voltar ao catálogo
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const band = report.band || { label: '—', tone: 'muted' }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Relatório de simulação</h2>
          <p>Revise score, critérios e conversa — depois refaça o treino se precisar.</p>
        </div>
        <div className="training-ai__page-header-actions">
          <Link
            to="/modules/training-ai"
            className="imp-btn imp-btn--ghost"
            onClick={resetSimulation}
          >
            ← Novo treinamento
          </Link>
          <button
            type="button"
            className="imp-btn imp-btn--ghost"
            onClick={() => setShowConversation((value) => !value)}
          >
            {showConversation ? 'Ocultar conversa' : 'Ver conversa'}
          </button>
          <Link
            to={`/modules/training-ai/simulacao/${scenarioId}`}
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
            {report.personaName} · {report.templateTitle}
            {report.mode === 'free' ? ' · Conversa por texto' : ''} ·{' '}
            {new Date(report.completedAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="training-ai__report-score">
          <strong>{report.score}</strong>
          <span className={`imp-pill imp-pill--${band.tone}`}>{band.label}</span>
          <span className="training-ai__meta">Score final</span>
        </div>
      </div>

      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Score final</p>
          <strong className="accent">{report.score}</strong>
          <span>Soma dos pesos aprovados</span>
        </article>
        {(report.sections || []).slice(0, 3).map((section) => (
          <article key={section.id} className="imp-metric">
            <p>{section.name}</p>
            <strong>
              {section.passedCount}/{section.totalCount}
            </strong>
            <div className="imp-progress imp-progress--spaced">
              <span
                style={{
                  width: `${
                    section.totalWeight
                      ? Math.round((section.earnedWeight / section.totalWeight) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </article>
        ))}
      </div>

      {showConversation ? (
        <div className="imp-panel training-ai__conversation">
          <div className="imp-panel__header">
            <div>
              <h2>Conversa</h2>
              <p>Transcript da sessão.</p>
            </div>
          </div>
          <div className="imp-chat">
            {(report.messages || []).map((message) => (
              <div
                key={message.id}
                className={`imp-chat__bubble imp-chat__bubble--${
                  message.role === 'ai' ? 'ai' : 'user'
                }`}
              >
                <span className="imp-chat__meta">
                  {message.speaker ||
                    (message.role === 'ai' ? report.personaName : 'Você')}
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
        </div>
      ) : null}

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Critérios de avaliação</h2>
            <p>{report.templateTitle} — pass/fail ponderado</p>
          </div>
        </div>
        <div className="training-ai__rubric">
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
                    aria-label={criterion.passed ? 'Aprovado' : 'Reprovado'}
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

      <div className="imp-grid-2">
        <div className="imp-panel training-ai__insight-panel training-ai__insight-panel--strong">
          <div className="imp-panel__header">
            <div>
              <h2>Pontos fortes</h2>
              <p>Critérios aprovados nesta sessão</p>
            </div>
          </div>
          <ul className="training-ai__list">
            {report.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="imp-panel training-ai__insight-panel training-ai__insight-panel--improve">
          <div className="imp-panel__header">
            <div>
              <h2>Áreas de melhoria</h2>
              <p>Próximos focos de prática</p>
            </div>
          </div>
          <ul className="training-ai__list training-ai__list--muted">
            {report.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="training-ai__coach">{report.coachNotes}</p>
        </div>
      </div>
    </section>
  )
}
