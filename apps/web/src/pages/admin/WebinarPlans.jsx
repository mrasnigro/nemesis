import { useEffect, useState } from 'react'
import { DataTable, FormModal, SectionHeader, StatusPill } from '../../components/admin'
import Panel from '../../components/Panel'
import { useLoad } from '../../modules/webinar/platform/hooks/useLoad.js'
import { webinarAdminApi } from '../../modules/webinar/platform/services/webinarAdminApi.js'
import { errorMessage, formatDate, formatLimit, formatMoney } from '../../modules/webinar/platform/utils/format.js'
import '../../modules/webinar/platform/styles/webinar-platform.css'
import './admin-shared.css'

const PAGE_SIZE = 20

const STATE_PILL = {
  active: { tone: 'active', label: 'Ativa' },
  expired: { tone: 'error', label: 'Vencida' },
  suspended: { tone: 'suspended', label: 'Suspensa' },
  cancelled: { tone: 'inactive', label: 'Cancelada' },
  none: { tone: 'pending', label: 'Sem assinatura' },
}

function Pill({ state }) {
  const entry = STATE_PILL[state] ?? STATE_PILL.none
  return <StatusPill value={entry.label} tone={entry.tone} />
}

/** The state of a subscription row from the list (the API computes it for the detail view). */
function rowState(row) {
  if (!row.subscriptionStatus) return 'none'
  if (row.subscriptionStatus !== 'active') return row.subscriptionStatus
  return row.expiresAt && new Date(row.expiresAt) <= new Date() ? 'expired' : 'active'
}

/** "49,90" or "49.90" → 4990 cents; empty → undefined; garbage → NaN. */
function toCents(text) {
  const value = String(text ?? '').trim().replace(',', '.')
  if (value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : Number.NaN
}

/** An empty limit field means "no limit". */
function toLimit(text) {
  const value = String(text ?? '').trim()
  if (value === '') return null
  const number = Number(value)
  return Number.isInteger(number) && number >= 1 ? number : Number.NaN
}

const centsToField = (cents) => (cents / 100).toFixed(2)
const endOfDay = (dateText) => new Date(`${dateText}T23:59:59`).toISOString()
const toDateField = (iso) => {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// ------------------------------------------------------------------- plans

function PlansTab() {
  const plans = useLoad(() => webinarAdminApi.listPlans(), [])
  const [editing, setEditing] = useState(null) // null = closed, {} = new, plan = edit
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function save(event) {
    const form = new FormData(event.currentTarget)
    const price = toCents(form.get('price'))
    const limits = {
      maxDurationMinutes: toLimit(form.get('maxDurationMinutes')),
      maxParticipants: toLimit(form.get('maxParticipants')),
      replayStorageDays: toLimit(form.get('replayStorageDays')),
    }
    if (price === undefined || Number.isNaN(price) || Object.values(limits).some(Number.isNaN)) {
      setError('Confira o preço e os limites: use números inteiros, ou deixe o limite em branco para "sem limite".')
      return
    }
    const isStarter = form.get('isStarter') === 'on'
    const trialText = String(form.get('trialDays') || '').trim()
    const body = {
      name: String(form.get('name') || '').trim(),
      description: String(form.get('description') || '').trim() || null,
      priceCents: price,
      ...limits,
      features: String(form.get('features') || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      isStarter,
      trialDays: isStarter && trialText ? Number(trialText) : null,
      isActive: form.get('isActive') === 'on',
      sortOrder: Number(form.get('sortOrder') || 0),
    }
    setSubmitting(true)
    setError('')
    try {
      if (editing?.id) await webinarAdminApi.updatePlan(editing.id, body)
      else await webinarAdminApi.createPlan(body)
      setEditing(null)
      setNotice('')
      await plans.reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(plan) {
    if (!window.confirm(`Excluir o plano ${plan.name}?`)) return
    setNotice('')
    try {
      await webinarAdminApi.deletePlan(plan.id)
      await plans.reload()
    } catch (err) {
      setNotice(errorMessage(err))
    }
  }

  const rows = plans.data ?? []

  return (
    <Panel>
      <SectionHeader
        title="Planos do Webinar"
        description="O catálogo vale para todos os clientes. Limite em branco = sem limite."
        actions={
          <button
            type="button"
            className="section-header__btn section-header__btn--primary"
            onClick={() => {
              setError('')
              setEditing({})
            }}
          >
            Novo plano
          </button>
        }
      />
      {plans.error ? <p className="form-modal__error">{errorMessage(plans.error)}</p> : null}
      {notice ? <p className="form-modal__error">{notice}</p> : null}
      <DataTable
        emptyMessage={plans.loading ? 'Carregando…' : 'Nenhum plano cadastrado.'}
        rows={rows}
        columns={[
          {
            key: 'name',
            label: 'Plano',
            render: (plan) => (
              <>
                <span className="data-table__primary">{plan.name}</span>
                <span className="data-table__secondary">
                  {plan.isStarter ? `Plano inicial${plan.trialDays ? ` · ${plan.trialDays} dias` : ''}` : plan.description || ' '}
                </span>
              </>
            ),
          },
          { key: 'price', label: 'Preço / mês', render: (plan) => formatMoney(plan.priceCents) },
          { key: 'duration', label: 'Duração', render: (plan) => formatLimit(plan.maxDurationMinutes, ' min') },
          { key: 'people', label: 'Participantes', render: (plan) => formatLimit(plan.maxParticipants) },
          { key: 'replay', label: 'Replay', render: (plan) => formatLimit(plan.replayStorageDays, ' dias') },
          { key: 'subscribers', label: 'Clientes' },
          {
            key: 'active',
            label: 'Situação',
            render: (plan) => <StatusPill value={plan.isActive ? 'active' : 'inactive'} />,
          },
          {
            key: 'actions',
            label: '',
            render: (plan) => (
              <div className="plan-actions">
                <button
                  type="button"
                  className="section-header__btn"
                  onClick={() => {
                    setError('')
                    setEditing(plan)
                  }}
                >
                  Editar
                </button>
                <button type="button" className="section-header__btn" onClick={() => remove(plan)}>
                  Excluir
                </button>
              </div>
            ),
          },
        ]}
      />

      <FormModal
        open={editing !== null}
        title={editing?.id ? `Editar ${editing.name}` : 'Novo plano'}
        description="Os limites valem para cada webinar do cliente."
        submitLabel={editing?.id ? 'Salvar plano' : 'Criar plano'}
        submitting={submitting}
        onClose={() => setEditing(null)}
        onSubmit={save}
      >
        {error ? <p className="form-modal__error">{error}</p> : null}
        <label className="form-modal__field">
          Nome
          <input name="name" defaultValue={editing?.name ?? ''} required maxLength={100} />
        </label>
        <label className="form-modal__field">
          Descrição
          <input name="description" defaultValue={editing?.description ?? ''} maxLength={2000} />
        </label>
        <label className="form-modal__field">
          Preço por mês (R$)
          <input name="price" inputMode="decimal" defaultValue={editing?.id ? centsToField(editing.priceCents) : '0.00'} required />
        </label>
        <label className="form-modal__field">
          Duração máxima de um webinar (minutos)
          <input name="maxDurationMinutes" inputMode="numeric" defaultValue={editing?.maxDurationMinutes ?? ''} placeholder="Sem limite" />
        </label>
        <label className="form-modal__field">
          Participantes por webinar (também limita quem assiste ao vivo)
          <input name="maxParticipants" inputMode="numeric" defaultValue={editing?.maxParticipants ?? ''} placeholder="Sem limite" />
        </label>
        <label className="form-modal__field">
          Dias de guarda do replay
          <input name="replayStorageDays" inputMode="numeric" defaultValue={editing?.replayStorageDays ?? ''} placeholder="Sem limite" />
        </label>
        <label className="form-modal__field">
          Recursos mostrados ao cliente (um por linha)
          <textarea name="features" rows={5} defaultValue={(editing?.features ?? []).join('\n')} />
        </label>
        <label className="form-modal__field">
          Ordem na lista
          <input name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} />
        </label>
        <div className="plan-checks">
          <label className="form-modal__check">
            <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
            Ativo (pode ser atribuído)
          </label>
          <label className="form-modal__check">
            <input type="checkbox" name="isStarter" defaultChecked={editing?.isStarter ?? false} />
            Plano inicial dos novos clientes
          </label>
        </div>
        <label className="form-modal__field">
          Dias de teste do plano inicial (vazio = sem vencimento)
          <input name="trialDays" inputMode="numeric" defaultValue={editing?.trialDays ?? ''} />
        </label>
      </FormModal>
    </Panel>
  )
}

// ----------------------------------------------------------- subscriptions

/** Plan, situation and expiry. Remounted (by `key`) whenever the saved subscription changes. */
function SubscriptionForm({ subscription, selectable, busy, onSave }) {
  const [noExpiry, setNoExpiry] = useState(Boolean(subscription) && subscription.expiresAt === null)

  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = { planId: String(form.get('planId')), status: String(form.get('status')) }
    const date = String(form.get('expiresAt') || '')
    if (noExpiry) body.expiresAt = null
    else if (date) body.expiresAt = endOfDay(date)
    onSave(body)
  }

  return (
    <form className="form-modal__form" onSubmit={submit}>
      <label className="form-modal__field">
        Plano
        <select name="planId" defaultValue={subscription?.plan.id ?? selectable[0]?.id} required>
          {selectable.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} · {formatMoney(plan.priceCents)}
            </option>
          ))}
        </select>
      </label>
      <label className="form-modal__field">
        Situação
        <select name="status" defaultValue={subscription?.status ?? 'active'}>
          <option value="active">Ativa</option>
          <option value="suspended">Suspensa</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </label>
      <label className="form-modal__field">
        Vencimento
        <input type="date" name="expiresAt" defaultValue={toDateField(subscription?.expiresAt)} disabled={noExpiry} />
      </label>
      <label className="form-modal__check">
        <input type="checkbox" checked={noExpiry} onChange={(event) => setNoExpiry(event.target.checked)} />
        Sem vencimento
      </label>
      <div className="plan-actions">
        <button type="submit" className="section-header__btn section-header__btn--primary" disabled={busy}>
          {subscription ? 'Salvar assinatura' : 'Atribuir plano'}
        </button>
      </div>
    </form>
  )
}

function CustomerPanel({ customerId, plans, onChanged }) {
  const detail = useLoad(() => webinarAdminApi.subscriptionDetail(customerId), [customerId])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const subscription = detail.data?.subscription ?? null
  const payments = detail.data?.payments ?? []

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      await action()
      await detail.reload()
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function recordPayment(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const amount = toCents(form.get('amount'))
    if (Number.isNaN(amount)) {
      setError('Valor inválido.')
      return
    }
    const body = {
      method: String(form.get('method') || '').trim() || null,
      note: String(form.get('note') || '').trim() || null,
    }
    if (amount !== undefined) body.amountCents = amount
    run(async () => {
      await webinarAdminApi.recordPayment(customerId, body)
      formElement.reset()
    })
  }

  function voidPayment(payment) {
    if (!window.confirm('Anular este pagamento? O vencimento da assinatura não muda.')) return
    run(() => webinarAdminApi.voidPayment(customerId, payment.id))
  }

  if (detail.loading && !detail.data) return <p className="dashboard__empty">Carregando…</p>
  if (detail.error && !detail.data) return <p className="form-modal__error">{errorMessage(detail.error)}</p>

  const selectable = plans.filter((plan) => plan.isActive || plan.id === subscription?.plan.id)

  return (
    <div className="admin-page__stack">
      {error ? <p className="form-modal__error">{error}</p> : null}
      {!subscription ? (
        <p className="dashboard__empty">
          Este cliente ainda não usou o Webinar, então não tem assinatura. Ao entrar pela primeira vez ele começa no plano
          inicial; você pode atribuir outro plano agora.
        </p>
      ) : (
        <p className="data-table__secondary">
          {subscription.plan.name} · <Pill state={subscription.state} /> · desde {formatDate(subscription.startedAt)} ·{' '}
          {subscription.expiresAt ? `vence em ${formatDate(subscription.expiresAt)}` : 'sem vencimento'}
        </p>
      )}

      <SubscriptionForm
        key={`${customerId}-${subscription?.plan.id}-${subscription?.status}-${subscription?.expiresAt}`}
        subscription={subscription}
        selectable={selectable}
        busy={busy}
        onSave={(body) => run(() => webinarAdminApi.setSubscription(customerId, body))}
      />

      {subscription ? (
        <form className="form-modal__form" onSubmit={recordPayment}>
          <strong>Registrar pagamento</strong>
          <p className="data-table__secondary">
            Renova um mês a partir do vencimento atual (ou de hoje, se já venceu). Não há cobrança automática: registre aqui o
            que foi recebido por fora.
          </p>
          <label className="form-modal__field">
            Valor (R$) — em branco usa o preço do plano ({formatMoney(subscription.plan.priceCents)})
            <input name="amount" inputMode="decimal" />
          </label>
          <label className="form-modal__field">
            Forma de pagamento
            <input name="method" maxLength={50} placeholder="Pix, boleto, transferência…" />
          </label>
          <label className="form-modal__field">
            Observação
            <input name="note" maxLength={500} />
          </label>
          <div className="plan-actions">
            <button type="submit" className="section-header__btn section-header__btn--primary" disabled={busy}>
              Registrar pagamento
            </button>
          </div>
        </form>
      ) : null}

      <DataTable
        emptyMessage="Nenhum pagamento registrado."
        rows={payments}
        columns={[
          { key: 'paidAt', label: 'Data', render: (payment) => formatDate(payment.paidAt) },
          { key: 'planName', label: 'Plano' },
          {
            key: 'period',
            label: 'Período',
            render: (payment) => `${formatDate(payment.periodStart)} a ${formatDate(payment.periodEnd)}`,
          },
          { key: 'amount', label: 'Valor', render: (payment) => formatMoney(payment.amountCents) },
          { key: 'method', label: 'Forma', render: (payment) => payment.method || '—' },
          {
            key: 'actions',
            label: '',
            render: (payment) =>
              payment.voidedAt ? (
                <span className="data-table__secondary">Anulado</span>
              ) : (
                <button type="button" className="section-header__btn" onClick={() => voidPayment(payment)} disabled={busy}>
                  Anular
                </button>
              ),
          },
        ]}
      />
    </div>
  )
}

function SubscriptionsTab() {
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const plans = useLoad(() => webinarAdminApi.listPlans(), [])
  const list = useLoad(() => webinarAdminApi.listSubscriptions({ q: term, page, pageSize: PAGE_SIZE }), [term, page])

  // Typing updates the box at once; the list is asked for only after a short pause.
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const rows = (list.data?.data ?? []).map((row) => ({ ...row, id: row.customerId }))
  const total = list.data?.page?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const selected = rows.find((row) => row.id === selectedId) ?? null

  return (
    <div className="admin-page__stack">
      <Panel>
        <SectionHeader
          title="Assinaturas"
          description="Clientes que contrataram o módulo Webinar. Quem ainda não entrou aparece sem assinatura."
        />
        <input
          className="form-modal__input"
          type="search"
          placeholder="Buscar cliente"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {list.error ? <p className="form-modal__error">{errorMessage(list.error)}</p> : null}
        <DataTable
          emptyMessage={list.loading ? 'Carregando…' : 'Nenhum cliente com o módulo Webinar.'}
          rows={rows}
          columns={[
            {
              key: 'customer',
              label: 'Cliente',
              render: (row) => (
                <button type="button" className="admin-row-link" onClick={() => setSelectedId(row.id)}>
                  <span className="data-table__primary">{row.customerName}</span>
                </button>
              ),
            },
            { key: 'plan', label: 'Plano', render: (row) => row.planName ?? '—' },
            { key: 'state', label: 'Situação', render: (row) => <Pill state={rowState(row)} /> },
            { key: 'expires', label: 'Vencimento', render: (row) => (row.subscriptionStatus ? (row.expiresAt ? formatDate(row.expiresAt) : 'Sem vencimento') : '—') },
            { key: 'paid', label: 'Último pagamento', render: (row) => formatDate(row.lastPaidAt) },
            {
              key: 'actions',
              label: '',
              render: (row) => (
                <button type="button" className="section-header__btn" onClick={() => setSelectedId(row.id)}>
                  Gerenciar
                </button>
              ),
            },
          ]}
        />
        {pages > 1 ? (
          <div className="plan-actions">
            <button type="button" className="section-header__btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </button>
            <span className="data-table__secondary">
              Página {page} de {pages}
            </span>
            <button type="button" className="section-header__btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Próxima
            </button>
          </div>
        ) : null}
      </Panel>

      {selected ? (
        <Panel title={`Assinatura · ${selected.customerName}`} description="Plano, situação, vencimento e pagamentos.">
          <CustomerPanel customerId={selected.id} plans={plans.data ?? []} onChanged={() => list.reload()} />
        </Panel>
      ) : null}
    </div>
  )
}

export default function WebinarPlansPage() {
  const [tab, setTab] = useState('subscriptions')
  return (
    <section className="admin-page">
      <div className="plan-tabs">
        <button
          type="button"
          className={`section-header__btn${tab === 'subscriptions' ? ' section-header__btn--primary' : ''}`}
          onClick={() => setTab('subscriptions')}
        >
          Assinaturas
        </button>
        <button
          type="button"
          className={`section-header__btn${tab === 'plans' ? ' section-header__btn--primary' : ''}`}
          onClick={() => setTab('plans')}
        >
          Planos
        </button>
      </div>
      {tab === 'plans' ? <PlansTab /> : <SubscriptionsTab />}
    </section>
  )
}
