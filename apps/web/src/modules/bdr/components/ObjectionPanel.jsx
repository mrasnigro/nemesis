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
  const paragraphs = entry.paragraphs || (entry.answer ? [entry.answer] : [])
  const paragraphsAfter = entry.paragraphsAfter || []
  const bullets = entry.bullets || []
  const branches = entry.branches || []
  const ganchoLines = entry.ganchoLines || (entry.gancho ? [entry.gancho] : [])

  return (
    <div className="bdr-objections__entry-body">
      {paragraphs.map((text) => (
        <p key={text.slice(0, 64)}>{text}</p>
      ))}

      {bullets.length > 0 ? (
        <ul className="bdr-objections__list">
          {bullets.map((item) => (
            <li key={item.slice(0, 64)}>{item}</li>
          ))}
        </ul>
      ) : null}

      {paragraphsAfter.map((text) => (
        <p key={text.slice(0, 64)}>{text}</p>
      ))}

      {branches.length > 0 ? (
        <div className="bdr-objections__branches">
          {branches.map((branch) => (
            <p key={branch.title}>
              {branch.text}{' '}
              <span className="bdr-objections__branch-title">{branch.title}</span>
            </p>
          ))}
        </div>
      ) : null}

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
 * Questionamentos Padrão — PLUCK spacing:
 * space-y-12 / mb-12 categories, mt-8 space-y-8 entries, border-l-8 + dashed spine.
 */
export default function ObjectionPanel() {
  const { scriptProgress, patchScriptProgress, patchDiagnosis, diagnosis } =
    useBdrSession()
  const openId = scriptProgress.openObjectionCategoryId
  // null/undefined → first category open (PLUCK); '' → all collapsed
  const effectiveOpenId =
    openId === undefined || openId === null
      ? OBJECTION_LIBRARY[0]?.id
      : openId

  const onCategoryToggle = (id, isOpen) => {
    patchScriptProgress({
      openObjectionCategoryId: isOpen ? id : '',
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
          {OBJECTION_LIBRARY.map((cat, catIndex) => {
            const color = cat.color || '#94a3b8'
            const open = effectiveOpenId === cat.id
            return (
              <details
                key={cat.id}
                className="bdr-objections__cat"
                style={{
                  '--obj-color': color,
                  /* PLUCK: rgba(accent, 0.05) as 8-digit hex */
                  '--obj-tint': `${color}0d`,
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
                  {/* PLUCK leading hr before first entry */}
                  <hr className="bdr-objections__rule" />
                  {cat.entries.map((entry, entryIndex) => (
                    <details
                      key={entry.id}
                      className="bdr-objections__entry"
                      open={catIndex === 0 && entryIndex === 0 ? true : undefined}
                    >
                      <summary className="bdr-objections__entry-summary">
                        <div className="bdr-objections__entry-copy">
                          <span
                            className="bdr-objections__entry-q"
                            style={{ color, marginBottom: 0 }}
                          >
                            {entryLabel(entry)}
                          </span>
                          {entry.subtitle ? (
                            <span
                              className="bdr-objections__entry-sub"
                              style={{ marginTop: 0 }}
                            >
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
