import { Link, useParams } from 'react-router-dom'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import '../styles/training-ai.css'

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
        <div className="imp-empty">Sem permissão para ver relatórios.</div>
      </section>
    )
  }

  if (!report) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Relatório indisponível. <Link to="/modules/training-ai">Voltar ao catálogo</Link>
        </div>
      </section>
    )
  }

  const band = report.band || { label: '—', tone: 'muted' }

  return (
    <section className="imp-module">
      <div className="imp-actions">
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

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Relatório de simulação</h2>
            <p className="training-ai__meta">
              {report.scenarioTitle} · {report.personaName} · {report.templateTitle} ·{' '}
              {new Date(report.completedAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <span className={`imp-pill imp-pill--${band.tone}`}>{band.label}</span>
        </div>
      </div>

      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Score final</p>
          <strong className="accent">{report.score}</strong>
          <span>Soma dos pesos dos critérios aprovados</span>
        </article>
        {(report.sections || []).slice(0, 3).map((section) => (
          <article key={section.id} className="imp-metric">
            <p>{section.name}</p>
            <strong>
              {section.passedCount}/{section.totalCount}
            </strong>
            <div className="imp-progress" style={{ marginTop: '0.55rem' }}>
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
              <p>Transcript da sessão (mock).</p>
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
                  {message.role === 'ai' ? report.personaName : 'Você'}
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
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Pontos fortes</h2>
              <p>Critérios aprovados</p>
            </div>
          </div>
          <ul className="training-ai__list">
            {report.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Áreas de melhoria</h2>
              <p>Coach (mock)</p>
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
