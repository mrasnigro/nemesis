import OutlineIcon from './OutlineIcon.jsx'
import TrainingButton from './TrainingButton.jsx'

/** In-app confirm dialog — replaces browser alert/confirm for leave/discard flows. */
export default function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel = 'Continuar editando',
  confirmLabel = 'Descartar',
  onCancel,
  onConfirm,
}) {
  if (!open) return null

  return (
    <div className="training-ai__confirm-modal" role="dialog" aria-modal="true" aria-labelledby="training-ai-confirm-title">
      <button
        type="button"
        className="training-ai__confirm-backdrop"
        aria-label="Fechar"
        onClick={onCancel}
      />
      <div className="training-ai__confirm-panel">
        <button
          type="button"
          className="training-ai__confirm-close"
          aria-label="Fechar"
          onClick={onCancel}
        >
          <OutlineIcon name="x" />
        </button>
        <h3 id="training-ai-confirm-title">{title}</h3>
        {message ? <p>{message}</p> : null}
        <div className="training-ai__confirm-actions">
          <TrainingButton type="button" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </TrainingButton>
          <TrainingButton type="button" variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </TrainingButton>
        </div>
      </div>
    </div>
  )
}
