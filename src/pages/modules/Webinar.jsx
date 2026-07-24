import ModulePage from '../../components/ModulePage'
import { getModuleById } from '../../modules'

export default function WebinarPage() {
  return <ModulePage module={getModuleById('webinar')} />
}
