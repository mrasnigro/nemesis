import { useBdrSession } from '../hooks/useBdrSession.js'

/** Company data grid — sample SDRDialer Dados da Empresa tab */
export default function LeadCompanyPanel() {
  const { call } = useBdrSession()
  const lead = call.currentLead

  if (!lead) {
    return (
      <div className="bdr-lead-panel">
        <p>Nenhum prospect conectado.</p>
      </div>
    )
  }

  const rows = [
    { label: 'Protocolo', value: lead.protocol },
    {
      label: 'Identificador',
      value: lead.identifier || lead.company,
      accent: true,
    },
    { label: 'CNPJ', value: lead.cnpj },
    { label: 'Razão Social', value: lead.socialReason || lead.company },
    { label: 'Nome do Sócio', value: lead.partnerName || lead.name },
    { label: 'CPF do Sócio', value: lead.partnerCpf },
    { label: 'Email Principal', value: lead.email },
    { label: 'Endereço', value: lead.address },
  ]

  return (
    <div className="bdr-lead-panel">
      <div className="bdr-lead-panel__grid">
        {rows.map((row) => (
          <div key={row.label}>
            <p className="bdr-lead-panel__label">{row.label}</p>
            <p
              className={`bdr-lead-panel__value${
                row.accent ? ' bdr-lead-panel__value--accent' : ''
              }`}
            >
              {row.value || '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
