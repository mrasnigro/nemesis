import './FormModal.css'

export default function FormModal({
  open,
  title,
  description,
  onClose,
  onSubmit,
  submitLabel = 'Salvar',
  submitting = false,
  children,
}) {
  if (!open) return null

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit?.(event)
  }

  return (
    <div className="form-modal" role="presentation" onClick={onClose}>
      <div
        className="form-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="form-modal__header">
          <div>
            <h3 id="form-modal-title">{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="form-modal__close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <form className="form-modal__form" onSubmit={handleSubmit}>
          <div className="form-modal__body">{children}</div>
          <footer className="form-modal__footer">
            <button type="button" className="form-modal__btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="form-modal__btn form-modal__btn--primary" disabled={submitting}>
              {submitting ? 'Salvando...' : submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
