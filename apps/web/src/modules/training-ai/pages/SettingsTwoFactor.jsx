import { useEffect, useState } from 'react'
import TrainingPage from '../components/TrainingPage.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingSettingsTwoFactorPage() {
  const { canManage } = useTrainingAi()
  const [peopleCount, setPeopleCount] = useState(0)
  const [required, setRequired] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    Promise.all([trainingApi.getSettings(), trainingApi.listDirectory()])
      .then(([settings, directory]) => {
        if (cancelled) return
        setRequired(Boolean(settings?.require2fa))
        setPeopleCount((directory || []).length)
        setError('')
        setLoaded(true)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Não foi possível carregar as configurações.')
          setLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [canManage])

  async function toggleRequired() {
    if (!canManage || saving) return
    const next = !required
    setSaving(true)
    setError('')
    try {
      const settings = await trainingApi.patchSettings({ require2fa: next })
      setRequired(Boolean(settings?.require2fa))
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar a configuração.')
    } finally {
      setSaving(false)
    }
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
                ? `${peopleCount} usuário(s) no diretório. O cadastro individual de 2FA será exigido no login quando a autenticação estiver disponível.`
                : 'Carregando...'}
            </p>
          </div>
          <button
            type="button"
            className={`training-ai__switch ${required ? 'is-on' : ''}`}
            role="switch"
            aria-checked={required}
            aria-label="Exigir autenticação em dois fatores"
            disabled={!loaded || saving}
            onClick={toggleRequired}
          >
            <span className="training-ai__switch-thumb" />
          </button>
        </div>
      </section>
    </TrainingPage>
  )
}
