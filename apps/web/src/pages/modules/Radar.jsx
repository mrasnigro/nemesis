import ModulePage from '../../components/ModulePage'
import { getModuleById } from '../../modules'

export default function RadarPage() {
  return <ModulePage module={getModuleById('radar')} />
}
