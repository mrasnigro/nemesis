import ModulePage from '../../components/ModulePage'
import { getModuleById } from '../../modules'

export default function BdrPage() {
  const module = getModuleById('bdr')

  function openBdrSystem() {
    if (!module?.externalUrl) return
    window.open(module.externalUrl, '_blank', 'noopener,noreferrer')
  }

  return <ModulePage module={module} onAction={openBdrSystem} />
}
