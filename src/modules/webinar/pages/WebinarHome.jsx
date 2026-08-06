import { useState } from 'react'
import {
  getWebinarServiceUrl,
  isWebinarServiceConfigured,
} from '../config/webinarConfig.js'
import { launchWebinarService } from '../services/webinarLauncher.js'

const REASON_COPY = {
  missing_url: 'URL do Webinar não configurada. Defina VITE_WEBINAR_URL no ambiente do IMP.',
  invalid_url: 'URL do Webinar inválida. Use um endereço http(s) absoluto.',
  popup_blocked: 'O navegador bloqueou a nova aba. Permita pop-ups para este site e tente novamente.',
}

export default function WebinarHome() {
  const configured = isWebinarServiceConfigured()
  const serviceUrl = getWebinarServiceUrl()
  const [error, setError] = useState('')

  function handleLaunch() {
    setError('')
    const result = launchWebinarService()
    if (!result.ok) {
      setError(REASON_COPY[result.reason] || 'Não foi possível abrir o Webinar.')
    }
  }

  return (
    <section className="imp-module webinar-page webinar-launcher">
      <header className="webinar-page__intro">
        <div>
          <h2>Webinar</h2>
          <p>
            Este módulo abre o serviço Webinar (sidecar) em uma nova aba. A
            autenticação e as permissões do workspace IMP continuam valendo
            aqui; a aplicação de webinars permanece externa.
          </p>
        </div>
      </header>

      <div className="imp-panel webinar-launcher__panel">
        <p className="webinar-launcher__status">
          {configured ? (
            <>
              Serviço configurado
              <span className="webinar-launcher__url" title={serviceUrl}>
                {serviceUrl}
              </span>
            </>
          ) : (
            <>Configure <code>VITE_WEBINAR_URL</code> para habilitar o acesso.</>
          )}
        </p>

        <div className="webinar-launcher__actions">
          <button
            type="button"
            className="imp-btn imp-btn--primary"
            onClick={handleLaunch}
            disabled={!configured}
          >
            Acessar Webinar
          </button>
        </div>

        {error ? (
          <p className="webinar-launcher__error" role="alert">
            {error}
          </p>
        ) : null}

        <p className="webinar-launcher__note">
          Integração futura: SSO / handoff JWT entre IMP e o serviço Webinar
          (sem incorporar o frontend do sidecar neste shell).
        </p>
      </div>
    </section>
  )
}
