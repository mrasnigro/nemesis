import { useMemo, useState } from 'react'
import { DataTable, FormModal, SectionHeader, StatusPill } from '../../components/admin'
import Panel from '../../components/Panel'
import { USER_PROFILE_LABELS } from '../../data/admin'
import { createUser, updateUser } from '../../data/admin/store'
import { useAdminStore } from '../../hooks/useAdminStore'
import { getModuleById } from '../../modules'
import AdminLoadState from './AdminLoadState'
import './admin-shared.css'

export default function UsersPage() {
  const { customers, users } = useAdminStore()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [rowError, setRowError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [role, setRole] = useState('imp')
  const [customerId, setCustomerId] = useState('')

  const activeCustomerId = customerId || customers[0]?.id || ''
  const customerModules = useMemo(() => {
    const customer = customers.find((item) => item.id === activeCustomerId)
    return customer?.modulesEnabled ?? []
  }, [customers, activeCustomerId])

  async function handleCreate(event) {
    const form = new FormData(event.currentTarget)
    const isPlatformAdmin = role === 'admin'
    const email = String(form.get('email') || '').trim()

    setSubmitting(true)
    try {
      await createUser({
        name: String(form.get('name') || '').trim(),
        username: String(form.get('username') || '').trim().toLowerCase(),
        email: email || null,
        password: String(form.get('password') || ''),
        role,
        customerId: isPlatformAdmin ? null : activeCustomerId,
        profile: isPlatformAdmin ? null : String(form.get('profile') || 'sdr_bdr'),
        moduleIds: isPlatformAdmin ? [] : form.getAll('modules').map(String),
      })
      setError('')
      setOpen(false)
    } catch (err) {
      const detail = err.details?.map((item) => `${item.path}: ${item.message}`).join(' · ')
      setError(detail ? `${err.message} (${detail})` : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStatus(user) {
    setRowError('')
    try {
      await updateUser(user.id, { status: user.status === 'inactive' ? 'active' : 'inactive' })
    } catch (err) {
      setRowError(err.message)
    }
  }

  return (
    <AdminLoadState>
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
          {rowError ? <p className="form-modal__error">{rowError}</p> : null}
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Usuário',
                render: (row) => (
                  <>
                    <span className="data-table__primary">{row.name}</span>
                    <span className="data-table__secondary">
                      {row.username}
                      {row.email ? ` · ${row.email}` : ''}
                    </span>
                  </>
                ),
              },
              {
                key: 'role',
                label: 'Papel',
                render: (row) =>
                  row.role === 'admin' ? (
                    <StatusPill value="admin" />
                  ) : (
                    <span className="data-table__secondary">{USER_PROFILE_LABELS[row.profile] ?? row.profile}</span>
                  ),
              },
              {
                key: 'customer',
                label: 'Cliente',
                render: (row) => row.customerName ?? 'IMP',
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
              {
                key: 'actions',
                label: '',
                render: (row) => (
                  <button type="button" className="admin-row-link" onClick={() => toggleStatus(row)}>
                    {row.status === 'inactive' ? 'Reativar' : 'Desativar'}
                  </button>
                ),
              },
            ]}
            rows={users}
          />
        </Panel>

        <FormModal
          open={open}
          title="Criar usuário"
          description="O usuário só poderá acessar módulos contratados pelo cliente."
          submitLabel="Criar usuário"
          submitting={submitting}
          onClose={() => {
            setOpen(false)
            setError('')
          }}
          onSubmit={handleCreate}
        >
          {error ? <p className="form-modal__error">{error}</p> : null}
          <label className="form-modal__field">
            Nome
            <input name="name" placeholder="Ex.: Marina Costa" required minLength={2} />
          </label>
          <label className="form-modal__field">
            Login
            <input
              name="username"
              placeholder="marina.costa"
              required
              minLength={3}
              pattern="[A-Za-z0-9._\-]+"
              autoComplete="off"
            />
          </label>
          <label className="form-modal__field">
            E-mail (opcional)
            <input name="email" type="email" placeholder="marina@empresa.com" />
          </label>
          <label className="form-modal__field">
            Senha inicial
            <input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <label className="form-modal__field">
            Tipo de acesso
            <select name="role" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="imp">Usuário de cliente</option>
              <option value="admin">Administrador IMP</option>
            </select>
          </label>
          {role === 'imp' ? (
            <>
              <label className="form-modal__field">
                Cliente
                <select
                  name="customerId"
                  value={activeCustomerId}
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
              <label className="form-modal__field">
                Perfil
                <select name="profile" defaultValue="sdr_bdr">
                  {Object.entries(USER_PROFILE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
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
                  <p className="form-modal__error">Este cliente ainda não possui módulos contratados.</p>
                )}
              </fieldset>
            </>
          ) : null}
        </FormModal>
      </section>
    </AdminLoadState>
  )
}
