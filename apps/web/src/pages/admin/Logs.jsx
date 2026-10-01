import { DataTable, SectionHeader, StatusPill } from '../../components/admin'
import Panel from '../../components/Panel'
import { useAdminStore } from '../../hooks/useAdminStore'
import AdminLoadState from './AdminLoadState'
import './admin-shared.css'

function formatDate(value) {
  return new Date(value).toLocaleString('pt-BR')
}

export default function LogsPage() {
  const { logs } = useAdminStore()

  return (
    <AdminLoadState>
      <section className="admin-page">
        <Panel>
          <SectionHeader
            title="Activity logs"
            description="Trilha de auditoria das ações administrativas e acessos (últimos 100 eventos)."
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
                render: (row) => row.customerName ?? '—',
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
            rows={logs}
          />
        </Panel>
      </section>
    </AdminLoadState>
  )
}
