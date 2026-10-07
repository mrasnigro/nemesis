import { useEffect, useMemo, useState } from 'react'
import TrainingPage from '../components/TrainingPage.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { useWorkspace } from '../../../workspace/WorkspaceContext.jsx'

function storageKey(customerId) {
  return `training-ai:require-2fa:${customerId || 'default'}`
}

export default function TrainingSettingsTwoFactorPage() {
  const { canManage } = useTrainingAi()
  const { currentCustomer } = useWorkspace()
  const customerId = currentCustomer?.id || ''

  const [people, setPeople] = useState([])
  const [required, setRequired] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      setRequired(localStorage.getItem(storageKey(customerId)) === '1')
    } catch {
      setRequired(false)
    }
    setLoaded(true)
  }, [customerId])

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    trainingApi
      .listDirectory()
      .then((directory) => {
        if (!cancelled) setPeople(directory || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Não foi possível carregar os usuários.')
      })
    return () => {
      cancelled = true
    }
  }, [canManage])

  const withoutTwoFactor = useMemo(() => {
    // Enrollment is not persisted yet — every directory user counts as without 2FA.
    return people.length
  }, [people])

  function toggleRequired() {
    if (!canManage) return
    setRequired((current) => {
      const next = !current
      try {
        localStorage.setItem(storageKey(customerId), next ? '1' : '0')
      } catch {
        /* ignore quota / private mode */
      }
      return next
    })
  }

  if (!canManage) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Somente o administrador da empresa gerencia esta configuração.</p>
        </div>
      </TrainingPage>
    )
  }

  return (
    <TrainingPage className="training-ai__settings-page">
      <header className="training-ai__page-header training-ai__settings-header">
        <div className="training-ai__page-title-row">
          <OutlineIcon name="shield" className="training-ai__settings-title-icon" />
          <h2>Autenticação em dois fatores</h2>
        </div>
      </header>

      {error ? <p className="training-ai__form-error">{error}</p> : null}

      <section className="imp-panel training-ai__settings-card">
        <div className="training-ai__settings-row">
          <div>
            <strong>Exigir autenticação em dois fatores</strong>
            <p>
              {loaded
                ? `${withoutTwoFactor} usuário(s) sem autenticação em dois fatores cadastrada.`
                : 'Carregando...'}
            </p>
          </div>
          <button
            type="button"
            className={`training-ai__switch ${required ? 'is-on' : ''}`}
            role="switch"
            aria-checked={required}
            aria-label="Exigir autenticação em dois fatores"
            onClick={toggleRequired}
          >
            <span className="training-ai__switch-thumb" />
          </button>
        </div>
      </section>
    </TrainingPage>
  )
}
