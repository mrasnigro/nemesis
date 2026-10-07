import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import TrainingButton from '../components/TrainingButton.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import { flattenCriteria } from '../data/evaluationTemplates.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

const PAGE_SIZE = 8

export default function TrainingTemplatesPage() {
  const navigate = useNavigate()
  const { evaluationTemplates, canManage } = useTrainingAi()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return evaluationTemplates
    return evaluationTemplates.filter((item) => String(item.title || '').toLowerCase().includes(term))
  }, [evaluationTemplates, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <TrainingPage className="training-ai__templates-page">
      <header className="training-ai__page-header training-ai__templates-header">
        <div className="training-ai__page-title-row">
          <OutlineIcon name="clipboard" />
          <h2>Templates de Avaliação</h2>
        </div>
        <div className="training-ai__page-header-actions training-ai__templates-actions">
          <label className="training-ai__search training-ai__search--action training-ai__search--personas">
            <span className="sr-only">Pesquisar templates</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Pesquisar..."
            />
            <span className="training-ai__search-btn" aria-hidden="true">
              <OutlineIcon name="search" />
            </span>
          </label>
          {canManage ? (
            <TrainingButton to="/modules/training-ai/templates/novo" variant="primary">
              <OutlineIcon name="plus" />
              Criar Template
            </TrainingButton>
          ) : null}
        </div>
      </header>

      <div className="imp-panel training-ai__templates-stage">
        {pageRows.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhum template</h3>
            <p>Crie um template com perguntas sim/não e pesos que somem 100.</p>
            {canManage ? (
              <TrainingButton to="/modules/training-ai/templates/novo" variant="primary">
                <OutlineIcon name="plus" />
                Criar Template
              </TrainingButton>
            ) : null}
          </div>
        ) : (
          <>
            <div className="training-ai__template-grid">
              {pageRows.map((template) => {
                const criteria = flattenCriteria(template)
                const scenarios = Array.isArray(template.scenarioTypes) ? template.scenarioTypes.length : 0
                return (
                  <article
                    key={template.id}
                    className="training-ai__template-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/modules/training-ai/templates/${template.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/modules/training-ai/templates/${template.id}`)
                      }
                    }}
                  >
                    <header>
                      <h3>{template.title}</h3>
                      {canManage ? (
                        <TrainingButton
                          variant="primary"
                          iconOnly
                          className="training-ai__template-edit-btn"
                          aria-label={`Editar ${template.title}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(`/modules/training-ai/templates/${template.id}/editar`)
                          }}
                        >
                          <OutlineIcon name="pencil" />
                        </TrainingButton>
                      ) : null}
                    </header>
                    <div className="training-ai__template-stats">
                      <div>
                        <span className="training-ai__tile-label">Seções</span>
                        <strong>{String(template.sections?.length || 0).padStart(2, '0')}</strong>
                      </div>
                      <div>
                        <span className="training-ai__tile-label">Critérios</span>
                        <strong>{String(criteria.length).padStart(2, '0')}</strong>
                      </div>
                      <div>
                        <span className="training-ai__tile-label">Cenários</span>
                        <strong>{String(scenarios).padStart(2, '0')}</strong>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            <div className="training-ai__pagination">
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage(1)} aria-label="Primeira página">«</button>
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Anterior">‹</button>
              <span className="training-ai__page-num">{currentPage}</span>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Próxima">›</button>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)} aria-label="Última página">»</button>
            </div>
          </>
        )}
      </div>
    </TrainingPage>
  )
}
