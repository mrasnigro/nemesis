import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import OutlineIcon from './components/OutlineIcon.jsx'
import TrainingPage from './components/TrainingPage.jsx'
import { TrainingAiProvider, useTrainingAi } from './context/TrainingAiContext.jsx'
import './styles/training-ai.css'

function buildNav(canManage) {
  return [
    {
      id: 'dashboards',
      label: 'Dashboards',
      icon: <OutlineIcon name="chart" />,
      children: [
        { id: 'engagement', label: 'Engajamento', to: '/modules/training-ai/dashboards/engajamento' },
        { id: 'ranking', label: 'Ranking', to: '/modules/training-ai/dashboards/ranking' },
        { id: 'performance', label: 'Performance', to: '/modules/training-ai/dashboards/performance' },
        { id: 'communication', label: 'Métricas de Comunicação', to: '/modules/training-ai/dashboards/comunicacao' },
      ],
    },
    {
      id: 'training',
      label: 'Treinamento com IA',
      icon: <OutlineIcon name="headset" />,
      children: [
        { id: 'personas', label: 'Minhas Personas', to: '/modules/training-ai/personas' },
        { id: 'templates', label: 'Templates de Avaliação', to: '/modules/training-ai/templates' },
        { id: 'history', label: 'Histórico', to: '/modules/training-ai/historico' },
      ],
    },
    {
      id: 'admin',
      label: 'Administração',
      icon: <OutlineIcon name="notebook" />,
      children: [
        ...(canManage
          ? [
              { id: 'users', label: 'Usuários', to: '/modules/training-ai/usuarios' },
              { id: 'groups', label: 'Grupos', to: '/modules/training-ai/grupos' },
            ]
          : []),
        { id: 'profile', label: 'Minha Conta', to: '/modules/training-ai/conta' },
      ],
    },
    ...(canManage
      ? [
          {
            id: 'settings',
            label: 'Configurações',
            icon: <OutlineIcon name="settings" />,
            collapsible: true,
            defaultOpen: true,
            children: [
              {
                id: 'two-factor',
                label: 'Autenticação em dois fatores',
                to: '/modules/training-ai/configuracoes/dois-fatores',
              },
            ],
          },
        ]
      : []),
  ]
}

function TrainingWorkspace() {
  const { catalogReady, catalogError, canSimulate, canManage } = useTrainingAi()
  const nav = useMemo(() => buildNav(canManage), [canManage])

  if (!catalogReady) {
    return (
      <TrainingPage>
        <p>Carregando treinamento...</p>
      </TrainingPage>
    )
  }

  if (catalogError) {
    return (
      <TrainingPage>
        <h2>Treinamento IA</h2>
        <p>{catalogError}</p>
      </TrainingPage>
    )
  }

  return (
    <ModuleWorkspaceLayout
      className="module-workspace--training-ai"
      title="Treinamento IA"
      badge="IA"
      basePath="/modules/training-ai"
      nav={nav}
      headerActions={
        canSimulate ? (
          <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--primary">
            Iniciar nova simulação
          </Link>
        ) : null
      }
    />
  )
}

export default function TrainingAiLayout() {
  return (
    <TrainingAiProvider>
      <TrainingWorkspace />
    </TrainingAiProvider>
  )
}
