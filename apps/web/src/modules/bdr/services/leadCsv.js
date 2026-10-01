/**
 * Parses a lead spreadsheet exported as CSV (Excel pt-BR uses ";", others ",").
 * Header names are matched loosely so common exports import without remapping.
 */

const HEADER_ALIASES = {
  phone: ['telefone', 'phone', 'fone', 'celular', 'whatsapp', 'tel', 'numero', 'número'],
  company: ['empresa', 'company', 'razao social', 'razão social', 'nome fantasia', 'companyname'],
  name: ['nome', 'name', 'contato', 'responsavel', 'responsável', 'socio', 'sócio', 'decisor'],
  email: ['email', 'e-mail'],
  cnpj: ['cnpj'],
  address: ['endereco', 'endereço', 'address', 'logradouro'],
  city: ['cidade', 'city', 'municipio', 'município'],
  state: ['uf', 'estado', 'state'],
  cep: ['cep', 'zip'],
  partnerCpf: ['cpf', 'cpf socio', 'cpf sócio'],
  segment: ['segmento', 'setor', 'segment', 'cnae'],
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/[_]+/g, ' ')
}

function detectDelimiter(firstLine) {
  const counts = [';', ',', '\t'].map((d) => [d, firstLine.split(d).length])
  counts.sort((a, b) => b[1] - a[1])
  return counts[0][0]
}

function splitRows(text, delimiter) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

export function parseLeadCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const rows = splitRows(text, detectDelimiter(firstLine))
  if (rows.length < 2) return { leads: [], missingPhoneColumn: rows.length === 0 }
  const headers = rows[0].map(normalizeHeader)
  const columnFor = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = headers.findIndex((h) => aliases.includes(h))
    if (index >= 0) columnFor[field] = index
  }
  if (columnFor.phone == null) return { leads: [], missingPhoneColumn: true }
  const leads = rows.slice(1).map((cells) => {
    const lead = {}
    for (const [field, index] of Object.entries(columnFor)) {
      const value = (cells[index] || '').trim()
      if (value) lead[field] = value
    }
    if (!lead.phone) lead.phone = ''
    return lead
  })
  return { leads, missingPhoneColumn: false }
}
