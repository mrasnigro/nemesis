import ModulePage from '../../components/ModulePage'
import { getModuleById } from '../../modules'

export default function VslPage() {
  return <ModulePage module={getModuleById('vsl')} />
}
