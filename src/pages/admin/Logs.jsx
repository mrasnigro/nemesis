import { DataTable, SectionHeader, StatusPill } from '../../components/admin'
import Panel from '../../components/Panel'
import { activityLogs, getCustomerById } from '../../data/admin'
import './admin-shared.css'

function formatDate(value) {
  return new Date(value).toLocaleString('pt-BR')
}

export default function LogsPage() {
  const rows = [...activityLogs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )

  return (
    <section className="admin-page">
      <Panel>
        <SectionHeader
          title="Activity logs"
          description="Trilha de auditoria mockada para ações administrativas e operacionais."
        />
        <DataTable
          columns={[
            {
              key: 'summary',
              label: 'Evento',
              render: (row) => (
                <>
                  <span className="data-table__primary">{row.summary}</span>
                  <span className="data-table__secondary">{row.action}</span>
                </>
              ),
            },
            { key: 'actor', label: 'Autor' },
            {
              key: 'customer',
              label: 'Cliente',
              render: (row) => getCustomerById(row.customerId)?.name ?? '—',
            },
            {
              key: 'level',
              label: 'Nível',
              render: (row) => <StatusPill value={row.level} />,
            },
            {
              key: 'createdAt',
              label: 'Quando',
              render: (row) => formatDate(row.createdAt),
            },
          ]}
          rows={rows}
        />
      </Panel>
    </section>
  )
}
