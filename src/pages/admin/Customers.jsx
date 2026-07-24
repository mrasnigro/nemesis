import { useMemo, useState } from 'react'
import { DataTable, FormModal, SectionHeader, StatusPill } from '../../components/admin'
import Panel from '../../components/Panel'
import { createCustomer } from '../../data/admin/store'
import { useAdminStore } from '../../hooks/useAdminStore'
import { getModuleById, modules } from '../../modules'
import './admin-shared.css'

const PLANS = ['Starter', 'Growth', 'Enterprise']

export default function CustomersPage() {
  const { customers } = useAdminStore()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(customers[0]?.id ?? null)

  const selected = useMemo(
    () => customers.find((customer) => customer.id === selectedId) ?? customers[0] ?? null,
    [customers, selectedId]
  )

  function handleCreate(event) {
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const plan = String(form.get('plan') || 'Starter')
    const moduleIds = form.getAll('modules').map(String)

    if (!name) {
      setError('Informe o nome do cliente.')
      return
    }

    const customer = createCustomer({ name, plan, moduleIds, status: 'trial' })
    setSelectedId(customer.id)
    setError('')
    setOpen(false)
  }

  return (
    <section className="admin-page">
      <div className="admin-page__stack">
        <Panel>
          <SectionHeader
            title="Clientes"
            description="Crie contas multi-cliente e visualize módulos habilitados."
            actions={
              <button
                type="button"
                className="section-header__btn section-header__btn--primary"
                onClick={() => setOpen(true)}
              >
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
                  <button
                    type="button"
                    className="admin-row-link"
                    onClick={() => setSelectedId(row.id)}
                  >
                    <span className="data-table__primary">{row.name}</span>
                    <span className="data-table__secondary">{row.slug}</span>
                  </button>
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
                label: 'Módulos habilitados',
                render: (row) =>
                  row.modulesEnabled.length ? (
                    <div className="data-table__chips">
                      {row.modulesEnabled.map((moduleId) => (
                        <span key={moduleId} className="data-table__chip">
                          {getModuleById(moduleId)?.badge ?? moduleId}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="data-table__secondary">Nenhum módulo</span>
                  ),
              },
              { key: 'createdAt', label: 'Criado em' },
            ]}
            rows={customers}
          />
        </Panel>

        {selected ? (
          <Panel
            title={`Módulos habilitados · ${selected.name}`}
            description="Resumo dos módulos liberados para este cliente no fluxo de demonstração."
          >
            {selected.modulesEnabled.length ? (
              <div className="admin-enabled-modules">
                {selected.modulesEnabled.map((moduleId) => {
                  const module = getModuleById(moduleId)
                  return (
                    <article key={moduleId} className="admin-enabled-module">
                      <strong>{module?.title ?? moduleId}</strong>
                      <span>{module?.description}</span>
                      <StatusPill value={module?.status ?? 'coming-soon'} />
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="dashboard__empty">Nenhum módulo atribuído. Use Admin → Módulos.</p>
            )}
          </Panel>
        ) : null}
      </div>

      <FormModal
        open={open}
        title="Criar cliente"
        description="Cadastre uma nova conta e opcionalmente habilite módulos iniciais."
        submitLabel="Criar cliente"
        onClose={() => {
          setOpen(false)
          setError('')
        }}
        onSubmit={handleCreate}
      >
        {error ? <p className="form-modal__error">{error}</p> : null}
        <label className="form-modal__field">
          Nome do cliente
          <input name="name" placeholder="Ex.: Nova Conta Demo" required />
        </label>
        <label className="form-modal__field">
          Plano
          <select name="plan" defaultValue="Starter">
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="form-modal__field">
          <legend>Módulos iniciais</legend>
          <div className="form-modal__checkboxes">
            {modules.map((module) => (
              <label key={module.id} className="form-modal__check">
                <input type="checkbox" name="modules" value={module.id} />
                {module.title}
              </label>
            ))}
          </div>
        </fieldset>
      </FormModal>
    </section>
  )
}
