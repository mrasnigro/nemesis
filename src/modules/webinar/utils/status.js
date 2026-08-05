export function eventStatusPillClass(status) {
  if (status === 'completed') return 'imp-pill imp-pill--green'
  if (status === 'draft') return 'imp-pill imp-pill--muted'
  return 'imp-pill imp-pill--amber'
}

export function participantStatusPillClass(status) {
  if (status === 'attended') return 'imp-pill imp-pill--green'
  if (status === 'no_show') return 'imp-pill imp-pill--rose'
  return 'imp-pill imp-pill--muted'
}
