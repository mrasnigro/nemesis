/** Mirrors apps/api/src/modules/bdr/telephony/phone.ts so previews match what the API accepts. */
export function normalizePhone(input) {
  let digits = String(input || '').replace(/\D/g, '')
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2)
  digits = digits.replace(/^0+/, '')
  if (digits.length !== 10 && digits.length !== 11) return null
  return digits
}

export function formatPhone(national) {
  const ddd = national.slice(0, 2)
  const rest = national.slice(2)
  const split = rest.length === 9 ? 5 : 4
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`
}
