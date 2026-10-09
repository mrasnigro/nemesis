/** Shared page control for persona, template, and history lists. */
export default function Pager({ page, pageCount, onPage, label = 'Paginação' }) {
  const current = Math.min(Math.max(1, page), Math.max(1, pageCount))
  const last = Math.max(1, pageCount)

  return (
    <div className="training-ai__pagination" aria-label={label}>
      <button type="button" disabled={current <= 1} onClick={() => onPage(1)} aria-label="Primeira página">
        «
      </button>
      <button type="button" disabled={current <= 1} onClick={() => onPage(current - 1)} aria-label="Anterior">
        ‹
      </button>
      <span className="training-ai__page-num">{current}</span>
      <button type="button" disabled={current >= last} onClick={() => onPage(current + 1)} aria-label="Próxima">
        ›
      </button>
      <button type="button" disabled={current >= last} onClick={() => onPage(last)} aria-label="Última página">
        »
      </button>
    </div>
  )
}
