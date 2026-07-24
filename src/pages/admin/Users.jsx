import { useMemo, useState } from 'react'
import { DataTable, FormModal, SectionHeader, StatusPill } from '../../components/admin'
import Panel from '../../components/Panel'
import { createUser } from '../../data/admin/store'
import { useAdminStore } from '../../hooks/useAdminStore'
import { getModuleById } from '../../modules'
import './admin-shared.css'

export default function UsersPage() {
  const { customers, users } = useAdminStore()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')

  const customerModules = useMemo(() => {
    const customer = customers.find((item) => item.id === customerId)
    return customer?.modulesEnabled ?? []
  }, [customers, customerId])

  function handleCreate(event) {
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const email = String(form.get('email') || '').trim()
    const role = String(form.get('role') || 'imp')
    const selectedCustomerId = String(form.get('customerId') || '')
    const assignedModules = form.getAll('modules').map(String)

    if (!name || !email || !selectedCustomerId) {
      setError('Preencha nome, e-mail e cliente.')
      return
    }

    createUser({
      name,
      email,
      role,
      customerId: selectedCustomerId,
      assignedModules,
      status: 'invited',
    })

    setError('')
    setOpen(false)
  }

  return (
    <section className="admin-page">
      <Panel>
        <SectionHeader
          title="Usuários"
          description="Crie usuários vinculados a clientes e defina módulos liberados."
          actions={
            <button
              type="button"
              className="section-header__btn section-header__btn--primary"
              onClick={() => setOpen(true)}
            >
              Criar usuário
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
              render: (row) =>
                customers.find((customer) => customer.id === row.customerId)?.name ?? '—',
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <StatusPill value={row.status} />,
            },
            {
              key: 'modules',
              label: 'Módulos do usuário',
              render: (row) =>
                row.assignedModules?.length ? (
                  <div className="data-table__chips">
                    {row.assignedModules.map((moduleId) => (
                      <span key={moduleId} className="data-table__chip">
                        {getModuleById(moduleId)?.badge ?? moduleId}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="data-table__secondary">Nenhum</span>
                ),
            },
          ]}
          rows={users}
        />
      </Panel>

      <FormModal
        open={open}
        title="Criar usuário"
        description="O usuário só poderá acessar módulos já habilitados no cliente."
        submitLabel="Criar usuário"
        onClose={() => {
          setOpen(false)
          setError('')
        }}
        onSubmit={handleCreate}
      >
        {error ? <p className="form-modal__error">{error}</p> : null}
        <label className="form-modal__field">
          Nome
          <input name="name" placeholder="Ex.: Marina Costa" required />
        </label>
        <label className="form-modal__field">
          E-mail
          <input name="email" type="email" placeholder="marina@empresa.com" required />
        </label>
        <label className="form-modal__field">
          Papel
          <select name="role" defaultValue="imp">
            <option value="imp">imp</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label className="form-modal__field">
          Cliente
          <select
            name="customerId"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required
          >
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="form-modal__field">
          <legend>Módulos liberados</legend>
          {customerModules.length ? (
            <div className="form-modal__checkboxes">
              {customerModules.map((moduleId) => (
                <label key={moduleId} className="form-modal__check">
                  <input type="checkbox" name="modules" value={moduleId} defaultChecked />
                  {getModuleById(moduleId)?.title ?? moduleId}
                </label>
              ))}
            </div>
          ) : (
            <p className="form-modal__error">Este cliente ainda não possui módulos habilitados.</p>
          )}
        </fieldset>
      </FormModal>
    </section>
  )
}
