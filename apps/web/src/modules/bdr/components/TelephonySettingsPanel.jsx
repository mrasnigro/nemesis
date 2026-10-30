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

const CALLING_DAYS = [
  ['1', 'Seg'],
  ['2', 'Ter'],
  ['3', 'Qua'],
  ['4', 'Qui'],
  ['5', 'Sex'],
  ['6', 'Sáb'],
  ['7', 'Dom'],
]

const EMPTY_FORM = {
  provider: 'none',
  baseUrl: '',
  deviceId: '',
  ariUrl: '',
  ariUsername: '',
  trunkEndpoint: '',
<<<<<<< HEAD
=======
  webrtcWssUrl: '',
  sipDomain: '',
  amdEnabled: false,
  callingStart: '',
  callingEnd: '',
  callingDays: '1,2,3,4,5',
  inboundExtension: '',
  recordCalls: true,
>>>>>>> module/bdr
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
<<<<<<< HEAD
=======
    webrtcWssUrl: settings.webrtcWssUrl || '',
    sipDomain: settings.sipDomain || '',
    amdEnabled: Boolean(settings.amdEnabled),
    callingStart: settings.callingStart || '',
    callingEnd: settings.callingEnd || '',
    callingDays: settings.callingDays || '1,2,3,4,5',
    inboundExtension: settings.inboundExtension || '',
    recordCalls: settings.recordCalls !== false,
>>>>>>> module/bdr
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
<<<<<<< HEAD
=======
    webrtcWssUrl: form.webrtcWssUrl.trim() || null,
    sipDomain: form.sipDomain.trim() || null,
    amdEnabled: form.amdEnabled,
    callingStart: form.callingStart || null,
    callingEnd: form.callingEnd || null,
    callingDays: form.callingDays,
    inboundExtension: form.inboundExtension.trim() || null,
    recordCalls: form.recordCalls,
>>>>>>> module/bdr
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

  function toggleDay(day) {
    setForm((current) => {
      const selected = new Set(current.callingDays.split(',').filter(Boolean))
      if (selected.has(day)) selected.delete(day)
      else selected.add(day)
      const callingDays = CALLING_DAYS.map(([id]) => id).filter((id) => selected.has(id)).join(',')
      return { ...current, callingDays }
    })
  }

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
<<<<<<< HEAD
              do discador; credenciais SIP do tronco pertencem ao Asterisk, não a esta configuração.
=======
              do discador; credenciais SIP do tronco pertencem ao Asterisk. Para WebRTC, habilite WSS com certificado TLS
              confiável e configure o endpoint/domínio abaixo.
>>>>>>> module/bdr
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
<<<<<<< HEAD
=======
              <label htmlFor="bdr-webrtc-wss">WebSocket SIP seguro (WSS)</label>
              <input
                id="bdr-webrtc-wss"
                className="bdr-setup__input"
                type="url"
                value={form.webrtcWssUrl}
                onChange={update('webrtcWssUrl')}
                placeholder="wss://pbx.example.com:8089/ws"
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-sip-domain">Domínio SIP</label>
              <input
                id="bdr-sip-domain"
                className="bdr-setup__input"
                value={form.sipDomain}
                onChange={update('sipDomain')}
                placeholder="pbx.example.com"
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-asterisk-amd">Detectar caixa postal</label>
              <input
                id="bdr-asterisk-amd"
                type="checkbox"
                checked={form.amdEnabled}
                onChange={(event) => setForm((current) => ({ ...current, amdEnabled: event.target.checked }))}
              />
              <span>Exige o contexto imp-bdr-amd instalado no Asterisk. O app Stasis desse contexto tem de ser o mesmo de ASTERISK_ARI_APP.</span>
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-inbound-extension">Ramal que recebe ligações</label>
              <input
                id="bdr-inbound-extension"
                className="bdr-setup__input"
                value={form.inboundExtension}
                onChange={update('inboundExtension')}
                placeholder="ex.: 1001"
                maxLength={40}
              />
            </div>
            <div className="bdr-setup__row">
              <label htmlFor="bdr-record-calls">Gravar ligações</label>
              <input
                id="bdr-record-calls"
                type="checkbox"
                checked={form.recordCalls}
                onChange={(event) => setForm((current) => ({ ...current, recordCalls: event.target.checked }))}
              />
              <span>Exige informar o interlocutor. Desmarcado, o Asterisk não grava a ponte.</span>
            </div>
            <div className="bdr-setup__row">
>>>>>>> module/bdr
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

<<<<<<< HEAD
=======
        <div className="bdr-setup__row">
          <label htmlFor="bdr-calling-start">Horário permitido</label>
          <input
            id="bdr-calling-start"
            className="bdr-setup__input"
            type="time"
            value={form.callingStart}
            onChange={update('callingStart')}
          />
          <input
            id="bdr-calling-end"
            className="bdr-setup__input"
            type="time"
            aria-label="Fim do horário permitido"
            value={form.callingEnd}
            onChange={update('callingEnd')}
          />
        </div>
        <div className="bdr-setup__row">
          <span>Dias</span>
          {CALLING_DAYS.map(([id, label]) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={form.callingDays.split(',').includes(id)}
                onChange={() => toggleDay(id)}
              />
              {label}
            </label>
          ))}
          <span>Vazio no início e no fim significa sem restrição de horário.</span>
        </div>

>>>>>>> module/bdr
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
