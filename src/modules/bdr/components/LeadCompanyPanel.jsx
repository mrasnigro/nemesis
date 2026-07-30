import { useBdrSession } from '../hooks/useBdrSession.js'

/** Foundation company panel — full dialer script/diagnosis come in later phases */
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
    ['Protocolo', lead.protocol],
    ['Identificador', lead.identifier || lead.company],
    ['CNPJ', lead.cnpj],
    ['Razão Social', lead.socialReason || lead.company],
    ['Nome do Sócio', lead.partnerName || lead.name],
    ['CPF do Sócio', lead.partnerCpf],
    ['Email Principal', lead.email],
    ['Endereço', lead.address],
  ]

  return (
    <div className="bdr-lead-panel">
      <div className="bdr-lead-panel__grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value || '—'}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
