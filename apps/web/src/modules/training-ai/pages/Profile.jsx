import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingProfilePage() {
  const { user } = useAuth()
  const { canManage, canSimulate } = useTrainingAi()
  const roleLabel = user?.profile === 'customer_admin' ? 'Administrador do Sistema' : 'Usuário Comum'

  return (
    <section className="imp-module">
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
            <span className="training-ai__avatar-camera" title="Foto de perfil">📷</span>
          </div>
          <div>
            <h3>{user?.name || '—'}</h3>
            <p>{user?.email || 'Sem e-mail cadastrado'}</p>
            <span className="imp-pill imp-pill--amber">{roleLabel}</span>
          </div>
        </div>
        <p className="training-ai__meta training-ai__meta--center">
          Clique no ícone de câmera para alterar sua foto de perfil
          {canManage ? ' · Use Administração → Usuários para gerenciar a equipe.' : ''}
        </p>
      </div>

      <div className="imp-panel training-ai__profile-card">
        <div className="training-ai__page-header" style={{ marginBottom: 0 }}>
          <div>
            <h3>Autenticação em dois fatores</h3>
            <p>Desativada</p>
          </div>
          <button type="button" className="imp-btn imp-btn--primary" disabled title="Disponível em breve">
            Ativar
          </button>
        </div>
      </div>
    </section>
  )
}
