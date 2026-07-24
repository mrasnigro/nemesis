import { DataTable, SectionHeader, StatusPill } from '../../components/admin'
import Panel from '../../components/Panel'
import { getCustomerById, integrations } from '../../data/admin'
import './admin-shared.css'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

export default function IntegrationsPage() {
  return (
    <section className="admin-page">
      <Panel>
        <SectionHeader
          title="Integrações"
          description="Conexões externas por cliente (discadores, messaging, webhooks e dados)."
          actions={
            <button type="button" className="section-header__btn section-header__btn--primary">
              Nova integração
            </button>
          }
        />
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Integração',
              render: (row) => (
                <>
                  <span className="data-table__primary">{row.name}</span>
                  <span className="data-table__secondary">{row.provider}</span>
                </>
              ),
            },
            { key: 'type', label: 'Tipo' },
            {
              key: 'customer',
              label: 'Cliente',
              render: (row) => getCustomerById(row.customerId)?.name ?? '—',
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <StatusPill value={row.status} />,
            },
            {
              key: 'lastSyncAt',
              label: 'Último sync',
              render: (row) => formatDate(row.lastSyncAt),
            },
          ]}
          rows={integrations}
        />
      </Panel>
    </section>
  )
}
