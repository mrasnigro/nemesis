import { useState } from 'react'
import OutlineIcon from './OutlineIcon.jsx'

/**
 * Text field + add button that accumulates removable chips (objections, priorities, …).
 */
export default function ChipListInput({
  label,
  required = false,
  placeholder = '',
  values = [],
  onChange,
  maxItems = 20,
}) {
  const [draft, setDraft] = useState('')

  function addItem() {
    const next = draft.trim()
    if (!next) return
    if (values.includes(next)) {
      setDraft('')
      return
    }
    if (values.length >= maxItems) return
    onChange([...values, next])
    setDraft('')
  }

  function removeItem(index) {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div className="training-ai__chip-list">
      <span className="training-ai__chip-list-label">
        {label}
        {required ? <em aria-hidden="true">*</em> : null}
      </span>
      <div className="training-ai__chip-list-row">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addItem()
            }
          }}
        />
        <button
          type="button"
          className="training-ai__chip-list-add"
          onClick={addItem}
          aria-label={`Adicionar ${label}`}
          disabled={!draft.trim() || values.length >= maxItems}
        >
          <OutlineIcon name="plus" size={16} />
        </button>
      </div>
      {values.length ? (
        <ul className="training-ai__chip-list-items">
          {values.map((item, index) => (
            <li key={`${item}-${index}`}>
              <span>{item}</span>
              <button type="button" aria-label={`Remover ${item}`} onClick={() => removeItem(index)}>
                <OutlineIcon name="x" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
