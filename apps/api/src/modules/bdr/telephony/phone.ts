/** Brazilian national number: area code + subscriber, 10 (landline) or 11 (mobile) digits. */
export function normalizePhone(input: string): string | null {
  let digits = String(input || '').replace(/\D/g, '')
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2)
  digits = digits.replace(/^0+/, '')
  if (digits.length !== 10 && digits.length !== 11) return null
  return digits
}

export function formatPhone(national: string): string {
  const ddd = national.slice(0, 2)
  const rest = national.slice(2)
  const split = rest.length === 9 ? 5 : 4
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`
}

/** Providers report numbers with or without country code / trunk prefix; compare the last 10 digits. */
export function samePhone(a: unknown, national: string): boolean {
  const digits = String(a ?? '').replace(/\D/g, '')
  if (digits.length < 10) return false
  return digits.slice(-10) === national.slice(-10)
}
