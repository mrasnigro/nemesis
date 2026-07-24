import { DataTable, SectionHeader, StatusPill } from '../../components/admin'
import Panel from '../../components/Panel'
import { customers } from '../../data/admin'
import { getModuleById } from '../../modules'
import './admin-shared.css'

export default function CustomersPage() {
  return (
    <section className="admin-page">
      <Panel>
        <SectionHeader
          title="Clientes"
          description="Contas multi-cliente da plataforma. Estrutura pronta para onboarding e planos."
          actions={
            <button type="button" className="section-header__btn section-header__btn--primary">
              Novo cliente
            </button>
          }
        />
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Cliente',
              render: (row) => (
                <>
                  <span className="data-table__primary">{row.name}</span>
                  <span className="data-table__secondary">{row.slug}</span>
                </>
              ),
            },
            {
              key: 'plan',
              label: 'Plano',
              render: (row) => <StatusPill value={row.plan} />,
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <StatusPill value={row.status} />,
            },
            { key: 'usersCount', label: 'Usuários' },
            {
              key: 'modules',
              label: 'Módulos',
              render: (row) => (
                <div className="data-table__chips">
                  {row.modulesEnabled.map((moduleId) => (
                    <span key={moduleId} className="data-table__chip">
                      {getModuleById(moduleId)?.badge ?? moduleId}
                    </span>
                  ))}
                </div>
              ),
            },
            { key: 'createdAt', label: 'Criado em' },
          ]}
          rows={customers}
        />
      </Panel>
    </section>
  )
}
