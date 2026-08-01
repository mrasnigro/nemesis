import { OBJECTION_LIBRARY } from '../data/objections.js'
import { openQuestionamentosWindow } from '../services/openQuestionamentosWindow.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

function entryLabel(entry) {
  if (entry.label) return entry.label
  const bare = String(entry.question || '')
    .replace(/^\[|\]$/g, '')
    .trim()
  return `[${bare.toUpperCase()}]`
}

function EntryBody({ entry, onRegister }) {
  const paragraphs =
    entry.paragraphs || (entry.answer ? [entry.answer] : [])
  const ganchoLines =
    entry.ganchoLines || (entry.gancho ? [entry.gancho] : [])

  return (
    <div className="bdr-objections__entry-body">
      {paragraphs.map((text) => (
        <p key={text.slice(0, 64)}>{text}</p>
      ))}

      {ganchoLines.length > 0 ? (
        <div className="bdr-objections__gancho">
          {entry.ganchoTitle ? (
            <p className="bdr-objections__gancho-title">{entry.ganchoTitle}</p>
          ) : null}
          {ganchoLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}

      <div className="bdr-objections__resposta-wrap">
        <span className="bdr-objections__resposta">[RESPOSTA]</span>
      </div>

      {onRegister ? (
        <button type="button" className="bdr-objections__use" onClick={onRegister}>
          Registrar na anotação de objeções
        </button>
      ) : null}
    </div>
  )
}

/**
 * Questionamentos Padrão — PLUCK entry CTA:
 * label + subtitle + ▼ chevron, bordered card, dashed left spine.
 */
export default function ObjectionPanel() {
  const { scriptProgress, patchScriptProgress, patchDiagnosis, diagnosis } =
    useBdrSession()
  const openId = scriptProgress.openObjectionCategoryId

  const onCategoryToggle = (id, isOpen) => {
    patchScriptProgress({
      openObjectionCategoryId: isOpen ? id : null,
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
      <div className="bdr-objections__scroll">
        <div className="bdr-objections__toolbar">
          <button
            type="button"
            className="bdr-objections__external"
            onClick={() => {
              const opened = openQuestionamentosWindow()
              if (!opened) {
                window.alert(
                  'Permita pop-ups para abrir os Questionamentos em uma nova janela.',
                )
              }
            }}
          >
            <span>Abrir Questionamentos em uma nova Janela</span>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"
              />
            </svg>
          </button>
        </div>

        <div className="bdr-objections__cats">
          {OBJECTION_LIBRARY.map((cat) => {
            const color = cat.color || '#94a3b8'
            const open = openId === cat.id
            return (
              <details
                key={cat.id}
                className="bdr-objections__cat"
                style={{
                  '--obj-color': color,
                  '--obj-tint': `color-mix(in srgb, ${color} 5%, transparent)`,
                }}
                open={open}
                onToggle={(e) => onCategoryToggle(cat.id, e.currentTarget.open)}
              >
                <summary className="bdr-objections__cat-summary">
                  <div className="bdr-objections__cat-copy">
                    <h3 className="bdr-objections__cat-title">
                      {cat.title} ({cat.entries.length})
                    </h3>
                    {cat.snippet ? (
                      <p className="bdr-objections__snippet">{cat.snippet}</p>
                    ) : null}
                  </div>
                  <span className="bdr-objections__chevron" aria-hidden="true">
                    ▼
                  </span>
                </summary>

                <div className="bdr-objections__cat-body">
                  {cat.entries.map((entry) => (
                    <details key={entry.id} className="bdr-objections__entry">
                      <summary className="bdr-objections__entry-summary">
                        <div className="bdr-objections__entry-copy">
                          <span className="bdr-objections__entry-q">
                            {entryLabel(entry)}
                          </span>
                          {entry.subtitle ? (
                            <span className="bdr-objections__entry-sub">
                              {entry.subtitle}
                            </span>
                          ) : null}
                        </div>
                        <span
                          className="bdr-objections__entry-chevron"
                          aria-hidden="true"
                        >
                          ▼
                        </span>
                      </summary>
                      <EntryBody
                        entry={entry}
                        onRegister={() =>
                          appendObjectionNote(entry.question || entryLabel(entry))
                        }
                      />
                    </details>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      </div>
    </div>
  )
}
