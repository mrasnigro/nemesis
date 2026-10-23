import { useEffect, useState } from 'react'
import { useBdrSession } from '../hooks/useBdrSession.js'
import { bdrRepository } from '../services/bdrRepository.js'

const PROVIDERS = [
  { id: 'asterisk', label: 'Asterisk (ARI)' },
  { id: 'falevono', label: 'FaleVono' },
  { id: 'none', label: 'Desativada' },
  // The API rejects this one in production; it is only offered while developing.
  ...(import.meta.env.DEV ? [{ id: 'simulated', label: 'Simulador (desenvolvimento)' }] : []),
]

const EMPTY_FORM = {
  provider: 'none',
  baseUrl: '',
  deviceId: '',
  ariUrl: '',
  ariUsername: '',
  trunkEndpoint: '',
  callerId: '',
  maxChannels: '5',
  dialPrefix: '0',
  ringTimeoutSeconds: '30',
  maxAttempts: '3',
  retryBusyMinutes: '30',
  retryNoAnswerMinutes: '120',
  retryVoicemailMinutes: '240',
  apiToken: '',
  apiKey: '',
  ariPassword: '',
}

function toForm(settings) {
  return {
    ...EMPTY_FORM,
    provider: settings.provider,
    baseUrl: settings.baseUrl || '',
    deviceId: settings.deviceId || '',
    ariUrl: settings.ariUrl || '',
    ariUsername: settings.ariUsername || '',
    trunkEndpoint: settings.trunkEndpoint || '',
    callerId: settings.callerId || '',
    maxChannels: String(settings.maxChannels ?? 5),
    dialPrefix: settings.dialPrefix ?? '0',
    ringTimeoutSeconds: String(settings.ringTimeoutSeconds),
    maxAttempts: String(settings.maxAttempts),
    retryBusyMinutes: String(settings.retryBusyMinutes),
    retryNoAnswerMinutes: String(settings.retryNoAnswerMinutes),
    retryVoicemailMinutes: String(settings.retryVoicemailMinutes),
  }
}

function toPayload(form) {
  const payload = {
    provider: form.provider,
    baseUrl: form.baseUrl.trim() || null,
    deviceId: form.deviceId.trim() || null,
    ariUrl: form.ariUrl.trim() || null,
    ariUsername: form.ariUsername.trim() || null,
    trunkEndpoint: form.trunkEndpoint.trim() || null,
    callerId: form.callerId.trim() || null,
    maxChannels: Number(form.maxChannels),
    dialPrefix: form.dialPrefix.trim(),
    ringTimeoutSeconds: Number(form.ringTimeoutSeconds),
    maxAttempts: Number(form.maxAttempts),
    retryBusyMinutes: Number(form.retryBusyMinutes),
    retryNoAnswerMinutes: Number(form.retryNoAnswerMinutes),
    retryVoicemailMinutes: Number(form.retryVoicemailMinutes),
  }
  // Secrets are write-only: blank means "keep the stored value".
  if (form.apiToken.trim()) payload.apiToken = form.apiToken.trim()
  if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim()
  if (form.ariPassword.trim()) payload.ariPassword = form.ariPassword.trim()
  return payload
}

/**
 * Telephony connection and retry rules of the customer. Only rendered for the customer administrator;
 * the API enforces the same rule and never returns the stored credentials.
 */
export default function TelephonySettingsPanel() {
  const { reloadDialerConfig } = useBdrSession()
  const [form, setForm] = useState(EMPTY_FORM)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    bdrRepository
      .getTelephonySettings()
      .then((settings) => {
        if (cancelled) return
        setForm(toForm(settings))
        setHasCredentials(settings.hasCredentials)
        setLoaded(true)
      })
      .catch((error) => {
        if (!cancelled) setMessage(error?.message || 'Não foi possível carregar a telefonia.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const settings = await bdrRepository.saveTelephonySettings(toPayload(form))
      setForm(toForm(settings))
      setHasCredentials(settings.hasCredentials)
      await reloadDialerConfig()
      setMessage('Configuração salva.')
    } catch (error) {
      setMessage(error?.message || 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const needsCredentials = form.provider === 'falevono'
  const usesAsterisk = form.provider === 'asterisk'

  return (
    <section className="bdr-home__panel bdr-setup">
      <header>
        <h2>Central telefônica</h2>
        <p>Conexão do provedor e regras de nova tentativa. As credenciais nunca são exibidas depois de salvas.</p>
      </header>

      <form className="bdr-setup" onSubmit={save}>
        <div className="bdr-setup__row">
          <label htmlFor="bdr-tel-provider">Provedor</label>
          <select
            id="bdr-tel-provider"
            className="bdr-setup__input"
            value={form.provider}
            onChange={update('provider')}
            disabled={!loaded}
          >
            {PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>

        {needsCredentials ? (
          <>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-tel-url">URL do provedor</label>
              <input
                id="bdr-tel-url"
                className="bdr-setup__input"
                value={form.baseUrl}
                onChange={update('baseUrl')}
                placeholder="https://vono.me"
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-tel-device">ID do dispositivo</label>
              <input
                id="bdr-tel-device"
                className="bdr-setup__input"
                value={form.deviceId}
                onChange={update('deviceId')}
                maxLength={40}
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-tel-token">API token</label>
              <input
                id="bdr-tel-token"
                className="bdr-setup__input"
                type="password"
                autoComplete="off"
                value={form.apiToken}
                onChange={update('apiToken')}
                placeholder={hasCredentials ? 'salvo — deixe em branco para manter' : ''}
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-tel-key">API key</label>
              <input
                id="bdr-tel-key"
                className="bdr-setup__input"
                type="password"
                autoComplete="off"
                value={form.apiKey}
                onChange={update('apiKey')}
                placeholder={hasCredentials ? 'salva — deixe em branco para manter' : ''}
              />
            </div>
          </>
        ) : null}

        {usesAsterisk ? (
          <>
            <p className="bdr-setup__note">
              As credenciais são armazenadas criptografadas no servidor. Configure o endpoint SIP do operador na tela
              do discador; credenciais SIP do tronco pertencem ao Asterisk, não a esta configuração.
            </p>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-ari-url">URL ARI</label>
              <input
                id="bdr-ari-url"
                className="bdr-setup__input"
                type="url"
                value={form.ariUrl}
                onChange={update('ariUrl')}
                placeholder="https://pbx.example.com:8089/ari"
                required
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-ari-username">Usuário ARI</label>
              <input
                id="bdr-ari-username"
                className="bdr-setup__input"
                value={form.ariUsername}
                onChange={update('ariUsername')}
                autoComplete="off"
                required
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-ari-password">Senha ARI</label>
              <input
                id="bdr-ari-password"
                className="bdr-setup__input"
                type="password"
                autoComplete="new-password"
                value={form.ariPassword}
                onChange={update('ariPassword')}
                placeholder={hasCredentials ? 'salva — deixe em branco para manter' : ''}
                required={!hasCredentials}
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-ari-trunk">Endpoint PJSIP do tronco</label>
              <input
                id="bdr-ari-trunk"
                className="bdr-setup__input"
                value={form.trunkEndpoint}
                onChange={update('trunkEndpoint')}
                placeholder="vono"
                required
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-ari-caller-id">Identificação de origem (opcional)</label>
              <input
                id="bdr-ari-caller-id"
                className="bdr-setup__input"
                value={form.callerId}
                onChange={update('callerId')}
                maxLength={40}
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-ari-channels">Limite de canais</label>
              <input
                id="bdr-ari-channels"
                className="bdr-setup__input"
                type="number"
                min={1}
                max={100}
                value={form.maxChannels}
                onChange={update('maxChannels')}
              />
            </div>
          </>
        ) : null}

        <div className="bdr-setup__row">
          <label htmlFor="bdr-tel-prefix">Prefixo de discagem</label>
          <input
            id="bdr-tel-prefix"
            className="bdr-setup__input"
            value={form.dialPrefix}
            onChange={update('dialPrefix')}
            maxLength={8}
            inputMode="numeric"
          />
        </div>

        <div className="bdr-setup__row">
          <label htmlFor="bdr-tel-ring">Tempo de toque (s)</label>
          <input
            id="bdr-tel-ring"
            className="bdr-setup__input"
            type="number"
            min={10}
            max={120}
            value={form.ringTimeoutSeconds}
            onChange={update('ringTimeoutSeconds')}
          />
        </div>
        <div className="bdr-setup__row">
          <label htmlFor="bdr-tel-max">Máximo de tentativas por lead</label>
          <input
            id="bdr-tel-max"
            className="bdr-setup__input"
            type="number"
            min={1}
            max={20}
            value={form.maxAttempts}
            onChange={update('maxAttempts')}
          />
        </div>
        <div className="bdr-setup__row">
          <label htmlFor="bdr-tel-busy">Nova tentativa se ocupado (min)</label>
          <input
            id="bdr-tel-busy"
            className="bdr-setup__input"
            type="number"
            min={1}
            max={10080}
            value={form.retryBusyMinutes}
            onChange={update('retryBusyMinutes')}
          />
        </div>
        <div className="bdr-setup__row">
          <label htmlFor="bdr-tel-noanswer">Nova tentativa se não atendeu (min)</label>
          <input
            id="bdr-tel-noanswer"
            className="bdr-setup__input"
            type="number"
            min={1}
            max={10080}
            value={form.retryNoAnswerMinutes}
            onChange={update('retryNoAnswerMinutes')}
          />
        </div>
        <div className="bdr-setup__row">
          <label htmlFor="bdr-tel-voicemail">Nova tentativa se caixa postal (min)</label>
          <input
            id="bdr-tel-voicemail"
            className="bdr-setup__input"
            type="number"
            min={1}
            max={10080}
            value={form.retryVoicemailMinutes}
            onChange={update('retryVoicemailMinutes')}
          />
        </div>

        <button type="submit" className="bdr-setup__button" disabled={!loaded || saving}>
          {saving ? 'Salvando…' : 'Salvar configuração'}
        </button>
      </form>
      {message ? (
        <p className="bdr-setup__note" role="status">
          {message}
        </p>
      ) : null}
    </section>
  )
}
