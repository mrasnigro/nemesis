import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { RadarProvider } from './context/RadarContext.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', to: '/modules/radar', end: true },
  { id: 'analysis', label: 'Análise', to: '/modules/radar/analise' },
]

export default function RadarLayout() {
  return (
    <RadarProvider>
      <ModuleWorkspaceLayout
        title="Radar de Tendências"
        badge="Radar"
        basePath="/modules/radar"
        nav={NAV}
      />
    </RadarProvider>
  )
}
