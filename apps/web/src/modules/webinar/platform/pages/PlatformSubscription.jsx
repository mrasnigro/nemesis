import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad } from '../hooks/useLoad.js'
import { errorMessage, formatDate, formatLimit, formatMoney } from '../utils/format.js'
import StatusPill from '../components/StatusPill.jsx'

const LAPSED = {
  expired: 'A assinatura venceu. Você ainda vê seus webinars, mas não pode agendar nem iniciar novos até renovar.',
  suspended: 'A assinatura está suspensa. Você ainda vê seus webinars, mas não pode agendar nem iniciar novos.',
  cancelled: 'A assinatura foi cancelada. Você ainda vê seus webinars, mas não pode agendar nem iniciar novos.',
}

function expiryText(subscription) {
  if (subscription.expiresAt === null) return 'Sem vencimento'
  const days = subscription.daysLeft
  const when = formatDate(subscription.expiresAt)
  if (subscription.state === 'expired') return `Venceu em ${when}`
  return `${when} · ${days === 0 ? 'termina hoje' : `${days} ${days === 1 ? 'dia' : 'dias'}`}`
}

function Limits({ plan }) {
  return (
    <dl className="plan-limits">
      <div>
        <dt>Duração máxima</dt>
        <dd>{formatLimit(plan.maxDurationMinutes, ' min')}</dd>
      </div>
      <div>
        <dt>Participantes por webinar</dt>
        <dd>{formatLimit(plan.maxParticipants)}</dd>
      </div>
      <div>
        <dt>Guarda do replay</dt>
        <dd>{formatLimit(plan.replayStorageDays, ' dias')}</dd>
      </div>
    </dl>
  )
}

/** The customer's plan, what it allows, the plans on offer, and (for administrators) the payments on record. */
export default function PlatformSubscription() {
  const subscription = useLoad(() => webinarApi.subscription(), [])
  const plans = useLoad(() => webinarApi.plans(), [])
  const s = subscription.data

  return (
    <section className="imp-module">
      <header className="webinar-page-header">
        <div>
          <h2>Assinatura</h2>
          <p>O plano do Webinar da sua empresa e o que ele permite.</p>
        </div>
      </header>

      {subscription.error ? <p className="webinar-note webinar-note--error">{errorMessage(subscription.error)}</p> : null}
      {subscription.loading && !s ? <p className="webinar-note">Carregando…</p> : null}

      {s ? (
        <>
          {s.state !== 'active' ? <p className="webinar-note webinar-note--error">{LAPSED[s.state]}</p> : null}

          <div className="imp-module__metrics">
            <article className="imp-metric">
              <p>Plano</p>
              <strong className="accent">{s.plan.name}</strong>
              <span>{s.plan.priceCents > 0 ? `${formatMoney(s.plan.priceCents)} por mês` : 'Gratuito'}</span>
            </article>
            <article className="imp-metric">
              <p>Situação</p>
              <strong>
                <StatusPill status={s.state} kind="subscription" />
              </strong>
              <span>Desde {formatDate(s.startedAt)}</span>
            </article>
            <article className="imp-metric">
              <p>Vencimento</p>
              <strong>{s.expiresAt ? formatDate(s.expiresAt) : '—'}</strong>
              <span>{expiryText(s)}</span>
            </article>
          </div>

          <div className="imp-panel">
            <div className="imp-panel__header">
              <div>
                <h3>O que o plano permite</h3>
                {s.plan.description ? <p>{s.plan.description}</p> : null}
              </div>
            </div>
            <Limits plan={s.plan} />
            {s.plan.features.length > 0 ? (
              <ul className="plan-features">
                {s.plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}

      {plans.data && plans.data.length > 0 ? (
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h3>Planos</h3>
              <p>Para mudar de plano ou renovar, fale com a equipe IMP.</p>
            </div>
          </div>
          <div className="plan-grid">
            {plans.data.map((plan) => (
              <article key={plan.id} className={`plan-card${s && plan.id === s.plan.id ? ' plan-card--current' : ''}`}>
                <header>
                  <h4>{plan.name}</h4>
                  {s && plan.id === s.plan.id ? <span className="imp-pill imp-pill--blue">Seu plano</span> : null}
                </header>
                <p className="plan-card__price">{plan.priceCents > 0 ? `${formatMoney(plan.priceCents)}/mês` : 'Gratuito'}</p>
                <Limits plan={plan} />
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {s?.payments ? (
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h3>Pagamentos</h3>
              <p>Registrados pela equipe IMP.</p>
            </div>
          </div>
          {s.payments.length === 0 ? (
            <div className="imp-empty">Nenhum pagamento registrado ainda.</div>
          ) : (
            <table className="imp-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Plano</th>
                  <th>Período</th>
                  <th>Valor</th>
                  <th>Forma</th>
                </tr>
              </thead>
              <tbody>
                {s.payments.map((payment) => (
                  <tr key={payment.id} className={payment.voidedAt ? 'plan-voided' : undefined}>
                    <td>{formatDate(payment.paidAt)}</td>
                    <td>{payment.planName}</td>
                    <td>
                      {formatDate(payment.periodStart)} a {formatDate(payment.periodEnd)}
                    </td>
                    <td>{formatMoney(payment.amountCents)}</td>
                    <td>
                      {payment.method || '—'}
                      {payment.voidedAt ? <small className="webinar-table__sub">Anulado</small> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </section>
  )
}
