import { AssignmentMatrix, SectionHeader } from '../../components/admin'
import Panel from '../../components/Panel'
import { customers, getModuleCatalog, moduleAssignments } from '../../data/admin'
import './admin-shared.css'

export default function ModulesPage() {
  const catalog = getModuleCatalog()

  return (
    <section className="admin-page">
      <Panel>
        <SectionHeader
          title="Atribuição de módulos"
          description="Controle quais módulos do registry cada cliente pode acessar."
        />
        <AssignmentMatrix
          customers={customers}
          modules={catalog}
          initialAssignments={moduleAssignments}
        />
      </Panel>
    </section>
  )
}
