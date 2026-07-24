import { DataTable, SectionHeader, StatusPill } from '../../components/admin'
import Panel from '../../components/Panel'
import { getCustomerById, users } from '../../data/admin'
import './admin-shared.css'

export default function UsersPage() {
  return (
    <section className="admin-page">
      <Panel>
        <SectionHeader
          title="Usuários"
          description="Usuários vinculados a contas de clientes, com papéis e permissões."
          actions={
            <button type="button" className="section-header__btn section-header__btn--primary">
              Convidar usuário
            </button>
          }
        />
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Usuário',
              render: (row) => (
                <>
                  <span className="data-table__primary">{row.name}</span>
                  <span className="data-table__secondary">{row.email}</span>
                </>
              ),
            },
            {
              key: 'role',
              label: 'Papel',
              render: (row) => <StatusPill value={row.role} />,
            },
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
              key: 'permissions',
              label: 'Permissões',
              render: (row) => (
                <div className="data-table__chips">
                  {row.permissions.slice(0, 2).map((permission) => (
                    <span key={permission} className="data-table__chip">
                      {permission}
                    </span>
                  ))}
                  {row.permissions.length > 2 ? (
                    <span className="data-table__chip">+{row.permissions.length - 2}</span>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={users}
        />
      </Panel>
    </section>
  )
}
