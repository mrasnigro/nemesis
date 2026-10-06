import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad } from '../hooks/useLoad.js'
import { PLATFORM_BASE } from '../PlatformLayout.jsx'
import { errorMessage, formatDateTime, timezoneOptions } from '../utils/format.js'
import { newWebinarForm, payloadFromForm, planProblem } from '../utils/webinarForm.js'

const STEPS = ['Informações', 'Agendamento', 'Inscrição e publicação', 'Revisão']
const LAST = STEPS.length - 1

/** What stops a step from moving on, or '' when it is fine. */
function stepProblem(step, form, plan) {
  if (step === 0 && !form.title.trim()) return 'Informe o título do webinar.'
  if (step === 1) {
    if (!form.scheduledAt) return 'Informe a data e a hora do webinar.'
    const minutes = Number(form.durationMinutes)
    if (!Number.isInteger(minutes) || minutes < 1) return 'A duração precisa ser de pelo menos 1 minuto.'
  }
  if (step === 1 || step === 2) return planProblem(form, plan)
  return ''
}

/** How long registrations stay open: the webinar plus two hours, the same default the codes panel uses. */
function codeWindow(webinar) {
  const start = new Date(webinar.scheduledAt)
  const end = new Date(start.getTime() + (webinar.durationMinutes + 120) * 60_000)
  return { scheduledAt: start.toISOString(), expiresAt: end.toISOString() }
}

function Stepper({ step }) {
  return (
    <ol className="wizard-steps" aria-label="Etapas">
      {STEPS.map((label, index) => (
        <li
          key={label}
          className={index === step ? 'is-current' : index < step ? 'is-done' : ''}
          aria-current={index === step ? 'step' : undefined}
        >
          <span className="wizard-steps__number">{index < step ? '✓' : index + 1}</span>
          <span className="wizard-steps__label">{label}</span>
        </li>
      ))}
    </ol>
  )
}

function ReviewRow({ label, children }) {
  return (
    <div className="wizard-review__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** Creates a webinar step by step: details, schedule, registration and publishing, then a summary. */
export default function PlatformWebinarWizard() {
  const navigate = useNavigate()
  const subscription = useLoad(() => webinarApi.subscription(), [])
  const plan = subscription.data?.plan
  const canSchedule = !subscription.data || subscription.data.state === 'active'

  const [step, setStep] = useState(0)
  const [form, setForm] = useState(newWebinarForm)
  const [publish, setPublish] = useState('draft')
  const [createCode, setCreateCode] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Set when the webinar exists but its first code could not be created.
  const [created, setCreated] = useState(null)

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))
  const willSchedule = publish === 'scheduled' && canSchedule

  async function create() {
    setSaving(true)
    setError('')
    let webinar
    try {
      webinar = await webinarApi.createWebinar({ ...payloadFromForm(form), status: willSchedule ? 'scheduled' : 'draft' })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
      return
    }
    if (!createCode) {
      navigate(`${PLATFORM_BASE}/webinars/${webinar.id}`, { replace: true })
      return
    }
    try {
      await webinarApi.createAccessCode(webinar.id, codeWindow(webinar))
      navigate(`${PLATFORM_BASE}/webinars/${webinar.id}`, { replace: true })
    } catch (err) {
      setCreated({ id: webinar.id, problem: errorMessage(err) })
      setSaving(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    const problem = stepProblem(step, form, plan)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    if (step < LAST) setStep(step + 1)
    else create()
  }

  function back() {
    setError('')
    setStep(step - 1)
  }

  if (created) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          O webinar foi criado, mas o código de acesso não: {created.problem}
          <div className="imp-actions webinar-center">
            <Link to={`${PLATFORM_BASE}/webinars/${created.id}`} className="imp-btn imp-btn--primary">
              Abrir o webinar e criar o código
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="imp-module">
      <header className="webinar-page-header">
        <div>
          <h2>Novo webinar</h2>
          <p>Quatro passos rápidos. Você pode mudar tudo depois.</p>
        </div>
      </header>

      <Stepper step={step} />

      <form className="imp-panel webinar-form" onSubmit={submit}>
        {step === 0 ? (
          <>
            <label className="imp-field">
              <span>Título *</span>
              <input value={form.title} onChange={set('title')} required maxLength={255} autoFocus />
            </label>
            <label className="imp-field">
              <span>Descrição</span>
              <textarea value={form.description} onChange={set('description')} maxLength={5000} />
              <small className="webinar-table__sub">Aparece na página de inscrição. Diga o que a pessoa vai aprender.</small>
            </label>
            <div className="webinar-form__row">
              <label className="imp-field">
                <span>Apresentador</span>
                <input value={form.presenterName} onChange={set('presenterName')} maxLength={255} />
              </label>
              <label className="imp-field">
                <span>Foto do apresentador (URL)</span>
                <input
                  type="url"
                  value={form.presenterImageUrl}
                  onChange={set('presenterImageUrl')}
                  maxLength={500}
                  placeholder="https://"
                />
              </label>
            </div>
            <label className="imp-field">
              <span>Sobre o apresentador</span>
              <textarea value={form.presenterBio} onChange={set('presenterBio')} maxLength={5000} />
            </label>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="webinar-form__row">
              <label className="imp-field">
                <span>Data e hora * (no fuso escolhido ao lado)</span>
                <input type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} required />
              </label>
              <label className="imp-field">
                <span>Fuso horário</span>
                <select value={form.timezone} onChange={set('timezone')}>
                  {timezoneOptions(form.timezone).map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="imp-field">
              <span>Duração (minutos) *</span>
              <input
                type="number"
                min="1"
                max={plan?.maxDurationMinutes ?? 1440}
                value={form.durationMinutes}
                onChange={set('durationMinutes')}
                required
              />
              {plan?.maxDurationMinutes ? (
                <small className="webinar-table__sub">
                  Máximo no plano {plan.name}: {plan.maxDurationMinutes} min.
                </small>
              ) : null}
            </label>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="webinar-form__row">
              <label className="imp-field">
                <span>Limite de participantes</span>
                <input
                  type="number"
                  min="1"
                  max={plan?.maxParticipants ?? undefined}
                  value={form.maxParticipants}
                  onChange={set('maxParticipants')}
                  placeholder={plan?.maxParticipants ? `Até ${plan.maxParticipants} (plano ${plan.name})` : 'Sem limite'}
                />
              </label>
              <label className="imp-field">
                <span>Cor da página de inscrição</span>
                <input type="color" value={form.registrationColor} onChange={set('registrationColor')} />
              </label>
            </div>

            <fieldset className="wizard-choice">
              <legend>Como salvar</legend>
              <label>
                <input type="radio" name="publish" checked={publish === 'draft'} onChange={() => setPublish('draft')} />
                <span>
                  <strong>Rascunho</strong>
                  <small>Fica só para você e ainda não recebe inscrições.</small>
                </span>
              </label>
              <label className={canSchedule ? '' : 'is-disabled'}>
                <input
                  type="radio"
                  name="publish"
                  checked={publish === 'scheduled'}
                  disabled={!canSchedule}
                  onChange={() => setPublish('scheduled')}
                />
                <span>
                  <strong>Agendar agora</strong>
                  <small>
                    {canSchedule
                      ? 'Fica agendado e pronto para receber inscrições.'
                      : 'Indisponível: a assinatura do Webinar não está ativa.'}
                  </small>
                </span>
              </label>
            </fieldset>

            <label className="wizard-check">
              <input type="checkbox" checked={createCode} onChange={(event) => setCreateCode(event.target.checked)} />
              <span>
                Criar já um código de acesso
                <small>Sem código ninguém consegue se inscrever. Ele vale até duas horas depois do fim do webinar.</small>
              </span>
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <dl className="wizard-review">
            <ReviewRow label="Título">{form.title.trim()}</ReviewRow>
            <ReviewRow label="Descrição">{form.description.trim() || 'Sem descrição'}</ReviewRow>
            <ReviewRow label="Apresentador">{form.presenterName.trim() || 'Não informado'}</ReviewRow>
            <ReviewRow label="Quando">
              {formatDateTime(payloadFromForm(form).scheduledAt, form.timezone)} ({form.timezone})
            </ReviewRow>
            <ReviewRow label="Duração">{form.durationMinutes} min</ReviewRow>
            <ReviewRow label="Participantes">{form.maxParticipants || 'Sem limite próprio'}</ReviewRow>
            <ReviewRow label="Ao criar">{willSchedule ? 'Agendado' : 'Rascunho'}</ReviewRow>
            <ReviewRow label="Código de acesso">{createCode ? 'Será criado agora' : 'Você cria depois'}</ReviewRow>
          </dl>
        ) : null}

        {error ? (
          <p className="webinar-note webinar-note--error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="imp-actions">
          {step > 0 ? (
            <button type="button" className="imp-btn imp-btn--ghost" onClick={back} disabled={saving}>
              ← Voltar
            </button>
          ) : null}
          <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
            {step < LAST ? 'Continuar →' : saving ? 'Criando…' : 'Criar webinar'}
          </button>
          <Link to={`${PLATFORM_BASE}/webinars`} className="imp-btn imp-btn--ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  )
}
