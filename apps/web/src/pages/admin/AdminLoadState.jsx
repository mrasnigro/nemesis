import Panel from '../../components/Panel'
import { loadAdminData } from '../../data/admin/store'
import { useAdminStore } from '../../hooks/useAdminStore'

/** Renders a loading/error panel until the admin data is ready, then the children. */
export default function AdminLoadState({ children }) {
  const { status, error } = useAdminStore()

  if (status === 'error') {
    return (
      <section className="admin-page">
        <Panel title="Não foi possível carregar os dados" description={error}>
          <button
            type="button"
            className="section-header__btn section-header__btn--primary"
            onClick={() => loadAdminData()}
          >
            Tentar novamente
          </button>
        </Panel>
      </section>
    )
  }

  if (status !== 'ready') {
    return (
      <section className="admin-page">
        <p className="dashboard__empty">Carregando dados da plataforma...</p>
      </section>
    )
  }

  return children
}
