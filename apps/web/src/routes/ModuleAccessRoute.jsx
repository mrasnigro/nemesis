import { getModuleById } from '../modules'
import { useWorkspace } from '../workspace/WorkspaceContext'
import AccessDenied from '../pages/AccessDenied'

export default function ModuleAccessRoute({ moduleId, children }) {
  const { hasModuleAccess, isLoading, currentCustomer, currentUser } = useWorkspace()
  const module = getModuleById(moduleId)

  if (isLoading) {
    return (
      <section className="access-denied">
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Validando acesso ao módulo...</p>
      </section>
    )
  }

  if (!currentCustomer || !currentUser || !hasModuleAccess(moduleId)) {
    return <AccessDenied moduleName={module?.title} />
  }

  return children
}
