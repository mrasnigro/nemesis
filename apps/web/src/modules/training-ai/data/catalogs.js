export const DIFFICULTY_LABELS = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

export const SCORE_BANDS = [
  { min: 90, label: 'Excelente', tone: 'green' },
  { min: 75, label: 'Bom', tone: 'blue' },
  { min: 60, label: 'Em desenvolvimento', tone: 'amber' },
  { min: 0, label: 'Precisa reforço', tone: 'rose' },
]

export function scoreBand(score) {
  return SCORE_BANDS.find((band) => score >= band.min) ?? SCORE_BANDS.at(-1)
}
