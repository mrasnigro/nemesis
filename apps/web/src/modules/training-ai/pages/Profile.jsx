import { Link } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import { useAuth } from '../../../auth/AuthContext'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingProfilePage() {
  const { user } = useAuth()
  const { canManage, canSimulate, metrics } = useTrainingAi()
  const roleLabel = user?.profile === 'customer_admin' ? 'Administrador do Sistema' : 'Usuário Comum'

  return (
    <TrainingPage>
      <header className="training-ai__page-header">
        <div>
          <h2>Meu Perfil</h2>
        </div>
        {canSimulate ? (
          <div className="training-ai__page-header-actions">
            <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--primary">
              Iniciar nova simulação
            </Link>
          </div>
        ) : null}
      </header>

      <div className="imp-panel training-ai__profile-card">
        <div className="training-ai__user-detail-head">
          <div className="training-ai__avatar-wrap">
            <span className="training-ai__user-avatar training-ai__user-avatar--lg">
              {(user?.name || '?').slice(0, 1)}
            </span>
          </div>
          <div>
            <h3>{user?.name || '—'}</h3>
            <p>{user?.email || 'Sem e-mail cadastrado'}</p>
            <span className="imp-pill imp-pill--amber">{roleLabel}</span>
          </div>
        </div>
        <div className="training-ai__user-meta-row">
          <div>
            <span className="training-ai__tile-label">Usuário</span>
            <strong>{user?.username || '—'}</strong>
          </div>
          <div>
            <span className="training-ai__tile-label">Simulações concluídas</span>
            <strong>{metrics?.completed ?? 0}</strong>
          </div>
          <div>
            <span className="training-ai__tile-label">Score médio</span>
            <strong>{Number.isFinite(Number(metrics?.avgScore)) ? Math.round(Number(metrics.avgScore)) : '—'}</strong>
          </div>
        </div>
        {canManage ? (
          <p className="training-ai__meta training-ai__meta--center">
            Use Administração → Usuários para gerenciar a equipe.
          </p>
        ) : null}
      </div>

      {canManage ? (
        <div className="imp-panel training-ai__profile-card">
          <div className="training-ai__page-header" style={{ marginBottom: 0 }}>
            <div>
              <h3>Autenticação em dois fatores</h3>
              <p>A política da empresa é gerenciada em Configurações.</p>
            </div>
            <Link
              to="/modules/training-ai/configuracoes/dois-fatores"
              className="imp-btn imp-btn--primary"
            >
              Abrir configurações
            </Link>
          </div>
        </div>
      ) : null}
    </TrainingPage>
  )
}
