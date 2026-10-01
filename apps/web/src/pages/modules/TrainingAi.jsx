import ModulePage from '../../components/ModulePage'
import { getModuleById } from '../../modules'

export default function TrainingAiPage() {
  return <ModulePage module={getModuleById('training-ai')} />
}
