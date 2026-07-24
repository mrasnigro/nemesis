import { DataTable, SectionHeader, StatusPill } from '../../components/admin'
import Panel from '../../components/Panel'
import { permissions, rolePermissionMap } from '../../data/admin'
import './admin-shared.css'

export default function PermissionsPage() {
  const roleRows = Object.entries(rolePermissionMap).map(([role, keys]) => ({
    id: role,
    role,
    keys,
  }))

  return (
    <section className="admin-page">
      <div className="admin-page__stack">
        <Panel>
          <SectionHeader
            title="Catálogo de permissões"
            description="Chaves RBAC prontas para controle de acesso multi-cliente e por módulo."
          />
          <DataTable
            columns={[
              {
                key: 'label',
                label: 'Permissão',
                render: (row) => (
                  <>
                    <span className="data-table__primary">{row.label}</span>
                    <span className="data-table__secondary">{row.key}</span>
                  </>
                ),
              },
              {
                key: 'scope',
                label: 'Escopo',
                render: (row) => <StatusPill value={row.scope === 'admin' ? 'admin' : 'imp'} />,
              },
              { key: 'description', label: 'Descrição' },
            ]}
            rows={permissions}
          />
        </Panel>

        <Panel>
          <SectionHeader
            title="Mapa de papéis"
            description="Permissões padrão por papel. Evolução futura: overrides por cliente."
          />
          <DataTable
            columns={[
              {
                key: 'role',
                label: 'Papel',
                render: (row) => <StatusPill value={row.role} />,
              },
              {
                key: 'keys',
                label: 'Permissões',
                render: (row) => (
                  <div className="data-table__chips">
                    {row.keys.map((key) => (
                      <span key={key} className="data-table__chip">
                        {key}
                      </span>
                    ))}
                  </div>
                ),
              },
            ]}
            rows={roleRows}
          />
        </Panel>
      </div>
    </section>
  )
}
