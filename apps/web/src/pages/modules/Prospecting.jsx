import ModulePage from '../../components/ModulePage'
import { getModuleById } from '../../modules'

export default function ProspectingPage() {
  return <ModulePage module={getModuleById('prospecting')} />
}
