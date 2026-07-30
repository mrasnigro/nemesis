import { OBJECTION_LIBRARY } from '../data/objections.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

/**
 * Questionamentos Padrão — accordion library (7 categories).
 */
export default function ObjectionPanel() {
  const { scriptProgress, patchScriptProgress, patchDiagnosis, diagnosis } = useBdrSession()
  const openId = scriptProgress.openObjectionCategoryId

  const toggleCategory = (id) => {
    patchScriptProgress({
      openObjectionCategoryId: openId === id ? null : id,
    })
  }

  const appendObjectionNote = (question) => {
    const prev = diagnosis.objections || ''
    const line = `• ${question}`
    if (prev.includes(line)) return
    patchDiagnosis({
      objections: prev ? `${prev}\n${line}` : line,
    })
  }

  return (
    <div className="bdr-objections">
      <div className="bdr-objections__toolbar">
        <div>
          <h3>Questionamentos Padrão</h3>
          <span className="bdr-objections__note">
            Conteúdo de referência — use como apoio, não como motor de branch.
          </span>
        </div>
        <button
          type="button"
          className="bdr-objections__external"
          title="No IMP os questionamentos permanecem nesta aba"
          onClick={() => {
            window.alert('Questionamentos disponíveis nesta aba (fluxo dentro do IMP).')
          }}
        >
          Abrir Questionamentos em nova janela
        </button>
      </div>

      <ul className="bdr-objections__cats">
        {OBJECTION_LIBRARY.map((cat) => {
          const open = openId === cat.id
          return (
            <li key={cat.id} className={`bdr-objections__cat${open ? ' is-open' : ''}`}>
              <button
                type="button"
                className="bdr-objections__cat-btn"
                aria-expanded={open}
                onClick={() => toggleCategory(cat.id)}
              >
                <span>
                  {cat.title} <em>({cat.entries.length})</em>
                </span>
                <span className="bdr-objections__chevron">{open ? '▾' : '▸'}</span>
              </button>
              {!open ? (
                <p className="bdr-objections__snippet">{cat.entries[0]?.question}</p>
              ) : null}
              {open ? (
                <ul className="bdr-objections__entries">
                  {cat.entries.map((entry) => (
                    <li key={entry.id} className="bdr-objections__entry">
                      <strong>{entry.question}</strong>
                      <p>
                        <span className="bdr-script__tag">Resposta sugerida</span> {entry.answer}
                      </p>
                      <p>
                        <span className="bdr-script__tag bdr-script__tag--cyan">Gancho</span>{' '}
                        {entry.gancho}
                      </p>
                      <button
                        type="button"
                        className="bdr-objections__use"
                        onClick={() => appendObjectionNote(entry.question)}
                      >
                        Registrar na anotação de objeções
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
