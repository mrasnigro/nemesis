import { Link } from 'react-router-dom'

/**
 * Shared Treinamento IA button — always builds on imp-btn variants
 * so primary / ghost / icon controls stay visually consistent.
 */
export default function TrainingButton({
  as,
  to,
  type = 'button',
  variant = 'primary',
  iconOnly = false,
  active = false,
  className = '',
  children,
  ...rest
}) {
  const Comp = as || (to ? Link : 'button')
  const classes = [
    'imp-btn',
    variant === 'ghost' ? 'imp-btn--ghost' : 'imp-btn--primary',
    iconOnly ? 'training-ai__btn--icon' : '',
    active ? 'is-active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const shared = {
    className: classes,
    ...(to ? { to } : { type }),
    ...rest,
  }

  return <Comp {...shared}>{children}</Comp>
}
