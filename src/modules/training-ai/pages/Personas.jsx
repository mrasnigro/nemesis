import { Link, useNavigate } from 'react-router-dom'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import '../styles/training-ai.css'

export default function TrainingPersonasPage() {
  const navigate = useNavigate()
  const { personas, canManage, getScenariosForPersona } = useTrainingAi()

  return (
    <section className="imp-module">
      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Personas</h2>
            <p>Catálogo de clientes simulados para treinamento (mock).</p>
          </div>
          {canManage ? (
            <Link to="/modules/training-ai/personas/nova" className="imp-btn imp-btn--primary">
              + Nova persona
            </Link>
          ) : null}
        </div>

        {personas.length === 0 ? (
          <div className="imp-empty">Nenhuma persona cadastrada.</div>
        ) : (
          <div className="training-ai__persona-catalog">
            {personas.map((persona) => {
              const linked = getScenariosForPersona(persona.id)
              return (
                <article key={persona.id} className="training-ai__persona-card">
                  <header className="training-ai__persona-card-head">
                    <div>
                      <h3>{persona.name}</h3>
                      <p>
                        {persona.role} · {persona.industry}
                        {persona.company ? ` · ${persona.company}` : ''}
                      </p>
                    </div>
                    <span className="imp-pill imp-pill--amber">
                      {DIFFICULTY_LABELS[persona.difficulty] || persona.difficulty}
                    </span>
                  </header>
                  <p className="training-ai__persona-card-behavior">{persona.behavior}</p>
                  <p className="training-ai__meta">
                    Objetivo: {persona.trainingObjective}
                  </p>
                  <p className="training-ai__meta">
                    {linked.length} cenário{linked.length === 1 ? '' : 's'} vinculado
                    {linked.length === 1 ? '' : 's'}
                  </p>
                  <div className="imp-actions">
                    <button
                      type="button"
                      className="imp-btn imp-btn--ghost"
                      onClick={() => navigate(`/modules/training-ai/personas/${persona.id}`)}
                    >
                      Abrir
                    </button>
                    {canManage ? (
                      <button
                        type="button"
                        className="imp-btn imp-btn--ghost"
                        onClick={() =>
                          navigate(`/modules/training-ai/personas/${persona.id}/editar`)
                        }
                      >
                        Editar
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
