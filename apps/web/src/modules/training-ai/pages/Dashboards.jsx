import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import TrainingButton from '../components/TrainingButton.jsx'
import { SmoothLineChart, SoftBarChart, SoftHBarList } from '../components/FluffyCharts.jsx'
import { SERIES_TONES, niceMax, toneColor } from '../utils/chartMath.js'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { formatBrDate, toLocalIsoDate } from '../utils/dates.js'
import { csvRow, downloadCsv } from '../utils/download.js'

const BROWSER_TIME_ZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
})()

const MAX_TEMPLATE_LINES = 6

const DASH_TABS = [
  { id: 'engajamento', label: 'Engajamento' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'performance', label: 'Performance' },
  { id: 'comunicacao', label: 'Métricas de Comunicação' },
]

const PERIOD_OPTIONS = [
  { value: 7, label: '7 Dias' },
  { value: 30, label: '30 Dias' },
  { value: 60, label: '60 Dias' },
  { value: 90, label: '90 Dias' },
  { value: 180, label: '6 Meses' },
  { value: 365, label: '1 Ano' },
]

const SCOPE_OPTIONS = [
  { value: 'user', label: 'Usuário' },
  { value: 'group', label: 'Grupo' },
]

const DEFAULT_FILTERS = {
  days: 30,
  scopeType: 'user',
  userId: '',
  groupId: '',
  scopeLabel: '',
  personaId: '',
  personaQuery: '',
}

function dateRange(days) {
  const count = Math.max(1, Number(days) || 1)
  const end = new Date()
  end.setHours(12, 0, 0, 0)
  const out = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const day = new Date(end)
    day.setDate(end.getDate() - offset)
    out.push(toLocalIsoDate(day))
  }
  return out
}

/** Days represented by each chart point — grows with the filter period. */
function pointStep(days) {
  if (days <= 7) return 1
  if (days <= 30) return 2
  if (days <= 60) return 4
  if (days <= 90) return 7
  if (days <= 180) return 14
  return 30
}

function numberOrNull(value) {
  return value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
}

/** One point per calendar day of the period; days the API did not report stay `null` (no data, not zero). */
function fillDailySeries(days, sparseRows, keys) {
  const byDate = new Map((sparseRows || []).map((row) => [String(row.date).slice(0, 10), row]))
  return dateRange(days).map((date) => {
    const row = byDate.get(date)
    const point = { date }
    for (const key of keys) {
      point[key] = row ? numberOrNull(row[key]) : null
    }
    return point
  })
}

/** Groups days into chart points for long periods, averaging only the days that had data. */
function bucketSeries(days, sparseRows, keys) {
  const daily = fillDailySeries(days, sparseRows, keys)
  const step = pointStep(days)
  if (step <= 1) return daily.map((point) => ({ ...point, from: point.date }))
  const out = []
  // Align buckets to the end so the last point is always "today".
  const start = daily.length % step
  if (start > 0) out.push(averageChunk(daily.slice(0, start), keys))
  for (let i = start; i < daily.length; i += step) {
    out.push(averageChunk(daily.slice(i, i + step), keys))
  }
  return out
}

function averageChunk(chunk, keys) {
  const point = { date: chunk[chunk.length - 1].date, from: chunk[0].date }
  for (const key of keys) {
    const values = chunk.map((row) => row[key]).filter((value) => value != null)
    point[key] = values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null
  }
  return point
}

function shortDate(iso) {
  const [, month, day] = String(iso || '').slice(0, 10).split('-')
  return day && month ? `${day}/${month}` : String(iso || '')
}

function pointLabel(point) {
  return point.from && point.from !== point.date
    ? `${shortDate(point.from)} – ${shortDate(point.date)}`
    : formatBrDate(point.date)
}

function axisLabel(point) {
  return shortDate(point.date)
}

function ChartLegend({ series }) {
  return (
    <ul className="training-ai__chart-legend">
      {series.map((item) => (
        <li key={item.key}>
          <span className="training-ai__dot" style={{ background: toneColor(item.tone) }} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/** Smooth time series for the dashboard period, bucketed for long ranges, with a tooltip label per bucket. */
function PeriodLineChart({ points, series, days, valueSuffix = '', maxValue, ariaLabel }) {
  const chartPoints = bucketSeries(days, points, series.map((item) => item.key))
  return (
    <SmoothLineChart
      points={chartPoints}
      series={series}
      valueSuffix={valueSuffix}
      maxValue={maxValue}
      ariaLabel={ariaLabel}
      formatLabel={pointLabel}
      axisLabel={axisLabel}
    />
  )
}

function PeriodBarChart({ points, series, days, ariaLabel }) {
  const chartPoints = bucketSeries(days, points, series.map((item) => item.key))
  return <SoftBarChart points={chartPoints} series={series} ariaLabel={ariaLabel} formatLabel={pointLabel} axisLabel={axisLabel} />
}

function formatPct(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

function averageMinutes(row) {
  const simulations = Number(row?.simulations) || 0
  const minutes = Number(row?.minutes) || 0
  if (!simulations) return 0
  return Math.round((minutes / simulations) * 10) / 10
}

function formatMinutes(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 1,
    maximumFractionDigits: 1,
  })} min`
}

function formatScore(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })
}

function formatCount(value) {
  return Number(value || 0).toLocaleString('pt-BR')
}

function Metric({ label, value, hint, tone }) {
  return (
    <article className="training-ai__legend-metric">
      <span className={`training-ai__dot training-ai__dot--${tone || 'orange'}`} />
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </article>
  )
}

function truncateName(name, max = 22) {
  const text = String(name || '—')
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function RankingCompareChart({ title, rows, valueKey, selectedUserId, formatValue }) {
  const [hoverId, setHoverId] = useState(null)
  const max = niceMax(Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 0))
  const ticks = [0, 1, 2, 3, 4].map((step) => Math.round((max / 4) * step * 10) / 10)
  const hoverRow = rows.find((row) => row.userId === hoverId) || null
  const hoverIndex = hoverRow ? rows.findIndex((row) => row.userId === hoverId) : -1
  const hoverValue = hoverRow ? Number(hoverRow[valueKey]) || 0 : 0
  const hoverWidth = hoverRow ? Math.max(0, Math.min(100, (hoverValue / max) * 100)) : 0

  return (
    <section className="training-ai__rank-chart">
      <h4>{title}</h4>
      <div className="training-ai__rank-chart-frame">
        <div className="training-ai__rank-chart-corner" aria-hidden="true" />
        <div className="training-ai__rank-chart-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} style={{ left: `${(tick / max) * 100}%` }}>
              {tick}
            </span>
          ))}
        </div>

        <div className="training-ai__rank-chart-labels">
          {rows.map((row, index) => (
            <span
              key={row.userId}
              className={[
                row.userId === selectedUserId ? 'is-focus' : '',
                row.userId === hoverId ? 'is-hover' : '',
              ].filter(Boolean).join(' ')}
            >
              {index + 1}º {truncateName(row.userName)}
            </span>
          ))}
        </div>

        <div className="training-ai__rank-chart-plot" role="img" aria-label={title}>
          <div className="training-ai__rank-chart-grid" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} style={{ left: `${(tick / max) * 100}%` }} />
            ))}
          </div>

          <ul className="training-ai__rank-chart-bars">
            {rows.map((row) => {
              const value = Number(row[valueKey]) || 0
              const widthPct = Math.max(0, Math.min(100, (value / max) * 100))
              const focused = row.userId === selectedUserId
              const hovered = row.userId === hoverId
              return (
                <li
                  key={row.userId}
                  className={[
                    focused ? 'is-focus' : '',
                    hovered ? 'is-hover' : '',
                  ].filter(Boolean).join(' ')}
                  onMouseEnter={() => setHoverId(row.userId)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <span className="training-ai__rank-chart-track" />
                  <span
                    className="training-ai__rank-chart-bar"
                    style={{
                      width: `${hovered && value === 0
                        ? 2.5
                        : Math.max(widthPct, value > 0 ? 1.5 : 0)}%`,
                    }}
                  />
                </li>
              )
            })}
          </ul>

          {hoverRow ? (
            <div
              className="training-ai__rank-chart-tip"
              style={{
                top: `${((hoverIndex + 0.5) / Math.max(rows.length, 1)) * 100}%`,
                left: `min(${Math.max(hoverWidth, 8)}%, calc(100% - 12.5rem))`,
              }}
            >
              <strong>
                {hoverIndex + 1}º {hoverRow.userName}
              </strong>
              <span>
                {title}: {formatValue ? formatValue(hoverValue) : hoverValue}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function formatCredits(value) {
  return Number(value || 0).toLocaleString('pt-BR')
}

function ConsumoUsagePanel({ consumption, detailed, onToggleDetailed }) {
  const days = Number(consumption?.days || 30)
  const used = Number(consumption?.minutes || 0)

  return (
    <div className="training-ai__consumo-panel">
      <div className="training-ai__consumo-panel-head">
        <h3>
          Consumo no período
          <span
            className="training-ai__info-dot"
            title="Minutos de simulação concluídos no período filtrado (não é cota mensal de créditos)."
          >
            i
          </span>
        </h3>
        <p>Últimos {days} dias</p>
      </div>

      <div className="training-ai__consumo-meter training-ai__consumo-meter--plain">
        <strong className="training-ai__consumo-fraction">{formatCredits(used)} min</strong>
        <span className="training-ai__meta">
          {consumption?.simulations || 0} simulações · {consumption?.activeUsers || 0} usuários ativos
        </span>
      </div>

      <button type="button" className="training-ai__consumo-detail-link" onClick={onToggleDetailed}>
        Consumo detalhado ›
      </button>

      {detailed && consumption ? (
        <div className="training-ai__consumo-detail">
          <div className="imp-module__metrics">
            <article className="imp-metric"><p>Simulações</p><strong>{consumption.simulations}</strong><span>Total</span></article>
            <article className="imp-metric"><p>Minutos</p><strong>{consumption.minutes}</strong><span>Total</span></article>
            <article className="imp-metric"><p>Média por simulação</p><strong>{consumption.averageMinutes} min</strong></article>
            <article className="imp-metric"><p>Usuários ativos</p><strong>{consumption.activeUsers}</strong></article>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function TrainingDashboardsPage() {
  const { view = 'engajamento' } = useParams()
  const navigate = useNavigate()
  const { canManage, personas } = useTrainingAi()
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS)
  const [people, setPeople] = useState([])
  const [groups, setGroups] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [userSuggestOpen, setUserSuggestOpen] = useState(false)
  const [personaSuggestOpen, setPersonaSuggestOpen] = useState(false)
  const [consumoOpen, setConsumoOpen] = useState(false)
  const [consumoDetailed, setConsumoDetailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const activeView = DASH_TABS.some((tab) => tab.id === view) ? view : 'engajamento'

  useEffect(() => {
    if (activeView !== 'ranking') setSelectedUser(null)
  }, [activeView])

  useEffect(() => {
    setSelectedUser(null)
  }, [appliedFilters])

  useEffect(() => {
    if (view !== 'consumo') return
    setConsumoOpen(true)
    navigate('/modules/training-ai/dashboards/engajamento', { replace: true })
  }, [navigate, view])

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    Promise.all([trainingApi.listDirectory(), trainingApi.listGroups()])
      .then(([directory, groupRows]) => {
        if (cancelled) return
        setPeople(directory || [])
        setGroups(groupRows || [])
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [canManage])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    trainingApi
      .getDashboards({
        days: appliedFilters.days,
        userId: appliedFilters.scopeType === 'user' && appliedFilters.userId ? appliedFilters.userId : undefined,
        groupId: appliedFilters.scopeType === 'group' && appliedFilters.groupId ? appliedFilters.groupId : undefined,
        personaId: appliedFilters.personaId || undefined,
        tz: BROWSER_TIME_ZONE,
      })
      .then((payload) => {
        if (!cancelled) {
          setData(payload)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Não foi possível carregar o painel.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [appliedFilters, reloadKey])

  const engagement = data?.engagement
  const consumption = data?.consumption
  const ranking = data?.ranking || []
  const performance = data?.performance
  const communication = data?.communication
  const title = DASH_TABS.find((tab) => tab.id === activeView)?.label || 'Painel'

  const filteredPeople = useMemo(() => {
    const term = draftFilters.scopeLabel.trim().toLowerCase()
    const rows = people || []
    if (!term) return rows.slice(0, 12)
    return rows.filter((person) => {
      const haystack = `${person.name || ''} ${person.email || ''}`.toLowerCase()
      return haystack.includes(term)
    }).slice(0, 12)
  }, [draftFilters.scopeLabel, people])

  const filteredPersonas = useMemo(() => {
    const term = draftFilters.personaQuery.trim().toLowerCase()
    const rows = personas || []
    if (!term) return rows.slice(0, 12)
    return rows.filter((persona) => String(persona.name || '').toLowerCase().includes(term)).slice(0, 12)
  }, [draftFilters.personaQuery, personas])

  const filteredGroups = useMemo(() => {
    const term = draftFilters.scopeLabel.trim().toLowerCase()
    const rows = groups || []
    if (!term) return rows.slice(0, 12)
    return rows.filter((group) => String(group.name || '').toLowerCase().includes(term)).slice(0, 12)
  }, [draftFilters.scopeLabel, groups])

  // A ratio over an empty month is undefined, not 0%: leave those days as gaps.
  const engagementSeries = useMemo(
    () =>
      (engagement?.series || []).map((row) => ({
        date: row.date,
        dauMau: Number(row.mau) > 0 ? numberOrNull(row.dauMau) : null,
        dauWau: Number(row.wau) > 0 ? numberOrNull(row.dauWau) : null,
        wauMau: Number(row.mau) > 0 ? numberOrNull(row.wauMau) : null,
      })),
    [engagement],
  )

  const performanceSeries = useMemo(() => performance?.series || [], [performance])

  const templateRows = useMemo(() => performance?.templates || [], [performance])

  const templateLines = useMemo(() => {
    const top = templateRows.slice(0, MAX_TEMPLATE_LINES)
    const series = top.map((template, index) => ({
      key: `t${index}`,
      label: template.title,
      tone: SERIES_TONES[index % SERIES_TONES.length],
    }))
    const byDate = new Map()
    top.forEach((template, index) => {
      for (const point of template.series || []) {
        const row = byDate.get(point.date) || { date: point.date }
        row[`t${index}`] = point.averageScore
        byDate.set(point.date, row)
      }
    })
    return { series, points: [...byDate.values()] }
  }, [templateRows])

  const communicationSeries = useMemo(() => communication?.series || [], [communication])

  const hasPerformanceData = performanceSeries.some((row) => Number(row.simulations) > 0)
  const hasEngagementData = engagementSeries.some((row) => row.dauMau != null)

  function closeConsumo() {
    setConsumoOpen(false)
    setConsumoDetailed(false)
  }

  function closeFilterSuggest() {
    setUserSuggestOpen(false)
    setPersonaSuggestOpen(false)
  }

  function handleSuggestBlur(event, close) {
    const next = event.relatedTarget
    if (next && event.currentTarget.contains(next)) return
    window.setTimeout(close, 0)
  }

  function openFilters() {
    closeConsumo()
    setDraftFilters(appliedFilters)
    closeFilterSuggest()
    setShowFilters(true)
  }

  function closeFilters({ discard = true } = {}) {
    setShowFilters(false)
    closeFilterSuggest()
    if (discard) setDraftFilters(appliedFilters)
  }

  function applyFilters() {
    setAppliedFilters(draftFilters)
    setShowFilters(false)
    closeFilterSuggest()
  }

  function toggleConsumo() {
    closeFilters({ discard: true })
    setConsumoOpen((open) => {
      const next = !open
      if (!next) setConsumoDetailed(false)
      return next
    })
  }

  function patchDraft(patch) {
    setDraftFilters((current) => ({ ...current, ...patch }))
  }

  function exportCsv() {
    closeConsumo()
    closeFilters({ discard: true })
    if (!data) return
    const lines = []
    if (activeView === 'engajamento') {
      lines.push(csvRow(['data', 'usuarios_dia', 'usuarios_7d', 'usuarios_30d', 'dau_mau_pct', 'dau_wau_pct', 'wau_mau_pct', 'simulacoes']))
      for (const row of engagement?.series || []) {
        lines.push(csvRow([row.date, row.dau, row.wau, row.mau, row.dauMau, row.dauWau, row.wauMau, row.simulations]))
      }
    } else if (activeView === 'ranking') {
      lines.push(csvRow(['posicao', 'usuario', 'pontuacao_media', 'simulacoes', 'minutos', 'duracao_media_min']))
      ranking.forEach((row, index) => {
        lines.push(csvRow([index + 1, row.userName, row.averageScore, row.simulations, row.minutes, averageMinutes(row)]))
      })
    } else if (activeView === 'performance') {
      lines.push(csvRow(['data', 'simulacoes', 'nota_media', 'minutos', 'duracao_media_min']))
      for (const row of performanceSeries) {
        lines.push(csvRow([row.date, row.simulations, row.averageScore, row.minutes, row.averageMinutes]))
      }
      lines.push('')
      lines.push(csvRow(['template', 'nota_media', 'simulacoes']))
      for (const row of templateRows) lines.push(csvRow([row.title, row.averageScore, row.simulations]))
    } else {
      lines.push(csvRow(['data', 'fala_escuta_pct', 'palavras_por_minuto', 'maior_monologo_s', 'vicios_por_minuto']))
      for (const row of communicationSeries) {
        lines.push(csvRow([row.date, row.talkListenPct, row.wordsPerMinute, row.longestMonologueSec, row.fillersPerMinute]))
      }
    }
    lines.push('')
    lines.push(csvRow(['periodo_dias', 'simulacoes', 'minutos', 'usuarios_ativos']))
    lines.push(csvRow([appliedFilters.days, consumption?.simulations, consumption?.minutes, consumption?.activeUsers]))
    downloadCsv(`treinamento-${activeView}-${toLocalIsoDate(new Date())}.csv`, lines)
  }

  function selectPerson(person) {
    patchDraft({
      scopeType: 'user',
      userId: person.id,
      groupId: '',
      scopeLabel: person.name || '',
    })
    setUserSuggestOpen(false)
  }

  function selectGroup(group) {
    patchDraft({
      scopeType: 'group',
      groupId: group.id,
      userId: '',
      scopeLabel: group.name || '',
    })
    setUserSuggestOpen(false)
  }

  function selectPersona(persona) {
    patchDraft({
      personaId: persona.id,
      personaQuery: persona.name || '',
    })
    setPersonaSuggestOpen(false)
  }

  return (
    <TrainingPage className="training-ai__dashboards">
      <header className="training-ai__page-header">
        <div className="training-ai__page-title-row">
          {activeView === 'ranking' || activeView === 'comunicacao' ? (
            <OutlineIcon name="chart" />
          ) : null}
          <h2>{title}</h2>
        </div>
        <div className="training-ai__page-header-actions">
          <div className="training-ai__dash-tabs">
            <button
              type="button"
              className={`training-ai__dash-tab training-ai__dash-tab--consumo ${consumoOpen ? 'is-active' : ''}`}
              aria-pressed={consumoOpen}
              onClick={toggleConsumo}
            >
              <OutlineIcon name="calendar" />
              Consumo
            </button>
            <div className="training-ai__dash-tab-group" role="group" aria-label="Painéis">
              {DASH_TABS.map((tab) => (
                <Link
                  key={tab.id}
                  to={`/modules/training-ai/dashboards/${tab.id}`}
                  className={`training-ai__dash-tab ${activeView === tab.id ? 'is-active' : ''}`}
                  onClick={() => {
                    closeConsumo()
                    closeFilters({ discard: true })
                  }}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="training-ai__dash-actions">
            <TrainingButton
              variant="ghost"
              iconOnly
              active={showFilters}
              onClick={() => (showFilters ? closeFilters({ discard: true }) : openFilters())}
              aria-expanded={showFilters}
              aria-label="Filtros"
            >
              <OutlineIcon name="filter" />
              <OutlineIcon name="chevron" className="training-ai__outline-icon--chevron" />
            </TrainingButton>
            <TrainingButton variant="primary" onClick={exportCsv}>
              <OutlineIcon name="export" />
              Exportar
            </TrainingButton>

            {showFilters ? (
              <div className="training-ai__filter-modal" role="dialog" aria-modal="true" aria-label="Filtros do painel">
                <button
                  type="button"
                  className="training-ai__filter-backdrop"
                  aria-label="Fechar filtros"
                  onClick={() => closeFilters({ discard: true })}
                />
                <div className="training-ai__filter-card">
                  <label className="training-ai__filter-field">
                    <span className="sr-only">Período</span>
                    <select
                      value={draftFilters.days}
                      onChange={(event) => patchDraft({ days: Number(event.target.value) })}
                      onFocus={closeFilterSuggest}
                    >
                      {PERIOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="training-ai__filter-affix" aria-hidden="true">
                      <OutlineIcon name="calendar" />
                    </span>
                  </label>

                  {canManage ? (
                  <label className="training-ai__filter-field">
                    <span className="sr-only">Categoria</span>
                    <span className="training-ai__filter-prefix" aria-hidden="true">
                      <OutlineIcon name="users" />
                    </span>
                    <select
                      value={draftFilters.scopeType}
                      onFocus={closeFilterSuggest}
                      onChange={(event) => {
                        patchDraft({
                          scopeType: event.target.value,
                          scopeLabel: '',
                          userId: '',
                          groupId: '',
                        })
                        closeFilterSuggest()
                      }}
                    >
                      {SCOPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="training-ai__filter-affix" aria-hidden="true">
                      <OutlineIcon name="chevron" className="training-ai__outline-icon--chevron" />
                    </span>
                  </label>
                  ) : null}

                  {canManage ? (
                  <div
                    className="training-ai__filter-suggest"
                    onBlur={(event) => handleSuggestBlur(event, () => setUserSuggestOpen(false))}
                  >
                    <label className="training-ai__filter-field training-ai__filter-field--search">
                      <span className="sr-only">
                        {draftFilters.scopeType === 'group' ? 'Pesquisar grupo' : 'Pesquisar usuário'}
                      </span>
                      <input
                        value={draftFilters.scopeLabel}
                        onChange={(event) => {
                          const value = event.target.value
                          patchDraft({
                            scopeLabel: value,
                            ...(draftFilters.scopeType === 'user'
                              ? { userId: '' }
                              : { groupId: '' }),
                          })
                          setPersonaSuggestOpen(false)
                          setUserSuggestOpen(true)
                        }}
                        onFocus={() => {
                          setPersonaSuggestOpen(false)
                          setUserSuggestOpen(true)
                        }}
                        placeholder={draftFilters.scopeType === 'group' ? 'Pesquisar grupo...' : 'Pesquisar usuário...'}
                        autoComplete="off"
                      />
                      <span className="training-ai__filter-search-btn" aria-hidden="true">
                        <OutlineIcon name="search" />
                      </span>
                    </label>
                    {userSuggestOpen ? (
                      <div className="training-ai__suggest-panel">
                        <div className="training-ai__suggest-head">
                          <OutlineIcon name={draftFilters.scopeType === 'group' ? 'users' : 'user'} />
                          <strong>{draftFilters.scopeType === 'group' ? 'Grupos' : 'Pessoas'}</strong>
                        </div>
                        <ul className="training-ai__suggest-list">
                          {draftFilters.scopeType === 'group' ? (
                            filteredGroups.length === 0 ? (
                              <li className="is-empty">Nenhum grupo</li>
                            ) : (
                              filteredGroups.map((group) => (
                                <li key={group.id}>
                                  <button
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => selectGroup(group)}
                                  >
                                    {group.name}
                                  </button>
                                </li>
                              ))
                            )
                          ) : filteredPeople.length === 0 ? (
                            <li className="is-empty">Nenhum usuário</li>
                          ) : (
                            filteredPeople.map((person) => (
                              <li key={person.id}>
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => selectPerson(person)}
                                >
                                  {person.name}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  ) : null}

                  <div
                    className="training-ai__filter-suggest"
                    onBlur={(event) => handleSuggestBlur(event, () => setPersonaSuggestOpen(false))}
                  >
                    <label className="training-ai__filter-field training-ai__filter-field--search">
                      <span className="sr-only">Pesquisar persona</span>
                      <input
                        value={draftFilters.personaQuery}
                        onChange={(event) => {
                          patchDraft({ personaQuery: event.target.value, personaId: '' })
                          setUserSuggestOpen(false)
                          setPersonaSuggestOpen(true)
                        }}
                        onFocus={() => {
                          setUserSuggestOpen(false)
                          setPersonaSuggestOpen(true)
                        }}
                        placeholder="Pesquisar persona..."
                        autoComplete="off"
                      />
                      <span className="training-ai__filter-search-btn" aria-hidden="true">
                        <OutlineIcon name="user" />
                      </span>
                    </label>
                    {personaSuggestOpen ? (
                      <div className="training-ai__suggest-panel">
                        <div className="training-ai__suggest-head">
                          <OutlineIcon name="user" />
                          <strong>Personas</strong>
                        </div>
                        <ul className="training-ai__suggest-list">
                          {filteredPersonas.length === 0 ? (
                            <li className="is-empty">Nenhuma persona</li>
                          ) : (
                            filteredPersonas.map((persona) => (
                              <li key={persona.id}>
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => selectPersona(persona)}
                                >
                                  {persona.name}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  <button type="button" className="imp-btn imp-btn--primary" onClick={applyFilters}>
                    Aplicar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {error ? (
        <div className="training-ai__form-error" role="alert">
          {error}{' '}
          <button type="button" className="training-ai__linkish" onClick={() => setReloadKey((value) => value + 1)}>
            Tentar novamente
          </button>
        </div>
      ) : null}
      {loading && !data && !error ? <p className="training-ai__meta">Carregando…</p> : null}

      <div className="training-ai__dash-stage">
        {consumoOpen && consumption ? (
          <div
            className="training-ai__consumo-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Consumo de créditos"
          >
            <button
              type="button"
              className="training-ai__consumo-backdrop"
              aria-label="Fechar consumo"
              onClick={toggleConsumo}
            />
            <ConsumoUsagePanel
              consumption={consumption}
              detailed={consumoDetailed}
              onToggleDetailed={() => setConsumoDetailed((value) => !value)}
            />
          </div>
        ) : null}

      {activeView === 'engajamento' && engagement ? (
        <div className="training-ai__dash-grid training-ai__dash-grid--engagement">
          <div className="imp-panel training-ai__engagement-stage">
            <div className="training-ai__engagement-body">
              <div className="training-ai__engagement-chart">
                <div className="training-ai__engagement-chart-head">
                  <h3>Engajamento</h3>
                  <p className="training-ai__meta">
                    Fidelização dos Usuários
                    <span className="training-ai__info-dot" title="Indicadores de fidelização no período filtrado.">i</span>
                  </p>
                </div>
                {hasEngagementData ? (
                  <PeriodLineChart
                    points={engagementSeries}
                    days={appliedFilters.days}
                    valueSuffix="%"
                    maxValue={100}
                    ariaLabel="Evolução do engajamento"
                    series={[
                      { key: 'dauMau', label: 'DAU/MAU', tone: 'orange' },
                      { key: 'dauWau', label: 'DAU/WAU', tone: 'purple' },
                      { key: 'wauMau', label: 'WAU/MAU', tone: 'blue' },
                    ]}
                  />
                ) : (
                  <div className="training-ai__chart-empty">Sem simulações no período</div>
                )}
              </div>
              <aside className="training-ai__legend-col" aria-label="Indicadores de engajamento">
                <Metric label="DAU/MAU" value={formatPct(engagement.dauMau)} tone="orange" />
                <Metric label="DAU/WAU" value={formatPct(engagement.dauWau)} tone="purple" />
                <Metric label="WAU/MAU" value={formatPct(engagement.wauMau)} tone="blue" />
              </aside>
            </div>
          </div>
          <div className="training-ai__dash-side">
            <div className="imp-panel training-ai__stat-card">
              <h3>Simulações Realizadas</h3>
              <strong>{engagement.simulations}</strong>
              <span>Total</span>
            </div>
            <div className="imp-panel training-ai__stat-card">
              <h3>Minutos em Simulação</h3>
              <strong>{engagement.minutes}</strong>
              <span>Total</span>
            </div>
          </div>
        </div>
      ) : null}

      {activeView === 'ranking' && data ? (
        <div className="imp-panel training-ai__ranking-panel">
          {selectedUser ? (
            <>
              <button
                type="button"
                className="training-ai__ranking-back"
                onClick={() => setSelectedUser(null)}
              >
                <OutlineIcon name="chevron" className="is-flip" />
                Ranking de Usuários - {selectedUser.userName}
              </button>

              <div className="training-ai__ranking-detail-charts">
                <RankingCompareChart
                  title="Pontuação Média"
                  rows={ranking}
                  valueKey="averageScore"
                  selectedUserId={selectedUser.userId}
                  formatValue={formatScore}
                />
                <RankingCompareChart
                  title="Duração Média (Minutos)"
                  rows={ranking.map((row) => ({
                    ...row,
                    averageMinutes: averageMinutes(row),
                  }))}
                  valueKey="averageMinutes"
                  selectedUserId={selectedUser.userId}
                  formatValue={formatMinutes}
                />
                <RankingCompareChart
                  title="Total de Simulações"
                  rows={ranking}
                  valueKey="simulations"
                  selectedUserId={selectedUser.userId}
                  formatValue={formatCount}
                />
              </div>
            </>
          ) : ranking.length === 0 ? (
            <>
              <div className="training-ai__ranking-head">
                <h3>Ranking de Usuários</h3>
              </div>
              <div className="training-ai__empty">
                <h3>Nenhuma simulação neste período</h3>
              </div>
            </>
          ) : (
            <div className="training-ai__ranking-split">
              <section className="training-ai__ranking-podium-pane" aria-label="Pódio">
                <div className="training-ai__ranking-head">
                  <h3>Ranking de Usuários</h3>
                  <span className="training-ai__ranking-sort">
                    <OutlineIcon name="sort" />
                    1º → último
                  </span>
                </div>

                <div className="training-ai__podium" aria-label="Classificação até o 3º lugar">
                  {[
                    { row: ranking[1], place: 2 },
                    { row: ranking[0], place: 1 },
                    { row: ranking[2], place: 3 },
                  ]
                    .filter((item) => item.row)
                    .map(({ row, place }) => (
                      <div key={row.userId} className={`training-ai__podium-col is-${place}`}>
                        <div className="training-ai__podium-person">
                          {place === 1 ? (
                            <span className="training-ai__podium-crown" aria-hidden="true">
                              <OutlineIcon name="crown" />
                            </span>
                          ) : null}
                          <span className="training-ai__podium-avatar">
                            <OutlineIcon name="user" />
                            <span className="training-ai__podium-badge">{place}</span>
                          </span>
                          <strong title={row.userName}>{row.userName}</strong>
                          <em>{formatScore(row.averageScore)}</em>
                        </div>
                        <div className="training-ai__podium-step">
                          <span className="training-ai__podium-mark">IA</span>
                        </div>
                      </div>
                    ))}
                </div>
              </section>

              <section className="training-ai__ranking-list-pane" aria-label="Classificação individual">
                <ul className="training-ai__ranking-list">
                  {ranking.map((row, index) => {
                    const place = index + 1
                    const avgMinutes = averageMinutes(row)
                    return (
                      <li
                        key={row.userId}
                        className={index % 2 === 0 ? 'is-odd' : 'is-even'}
                      >
                        <span className="training-ai__rank">{place}º</span>
                        <span className="training-ai__ranking-avatar" aria-hidden="true">
                          <OutlineIcon name="user" />
                        </span>
                        <strong className="training-ai__ranking-name" title={row.userName}>
                          {row.userName}
                        </strong>
                        <div className="training-ai__ranking-metrics">
                          <div>
                            <span className="training-ai__tile-label">Duração média</span>
                            <strong>
                              <OutlineIcon name="clock" />
                              {formatMinutes(avgMinutes)}
                            </strong>
                          </div>
                          <div>
                            <span className="training-ai__tile-label">Simulações</span>
                            <strong>
                              <OutlineIcon name="headset" />
                              {formatCount(row.simulations)}
                            </strong>
                          </div>
                          <div>
                            <span className="training-ai__tile-label">Pontuação média</span>
                            <strong>
                              <OutlineIcon name="trophy" />
                              {formatScore(row.averageScore)}
                            </strong>
                          </div>
                        </div>
                        <TrainingButton
                          variant="primary"
                          className="training-ai__ranking-details"
                          onClick={() => setSelectedUser(row)}
                        >
                          <OutlineIcon name="chart" />
                          Detalhes
                        </TrainingButton>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </div>
          )}
        </div>
      ) : null}

      {activeView === 'performance' && performance ? (
        <div className="training-ai__dash-grid">
          <div className="imp-panel">
            <h3>Métricas de Performance</h3>
            <ChartLegend
              series={[
                { key: 'averageScore', label: 'Média de Notas (eixo esquerdo)', tone: 'purple' },
                { key: 'averageMinutes', label: 'Média de Minutos (eixo direito)', tone: 'orange' },
              ]}
            />
            {hasPerformanceData ? (
              <PeriodBarChart
                points={performanceSeries}
                days={appliedFilters.days}
                ariaLabel="Média de notas e de minutos por período"
                series={[
                  { key: 'averageScore', label: 'Média de Notas', tone: 'purple', max: 100 },
                  { key: 'averageMinutes', label: 'Média de Minutos', tone: 'orange', axis: 'right', suffix: ' min' },
                ]}
              />
            ) : (
              <div className="training-ai__chart-empty">Sem simulações no período</div>
            )}
          </div>
          <div className="imp-panel">
            <h3>Evolução de Performance</h3>
            <ChartLegend series={[{ key: 'averageScore', label: 'Evolução de Notas', tone: 'purple' }]} />
            {hasPerformanceData ? (
              <PeriodLineChart
                points={performanceSeries}
                days={appliedFilters.days}
                maxValue={100}
                ariaLabel="Evolução da nota média"
                series={[{ key: 'averageScore', label: 'Média de Notas', tone: 'purple' }]}
              />
            ) : (
              <div className="training-ai__chart-empty">Sem simulações no período</div>
            )}
          </div>
          <div className="imp-panel">
            <h3>Métricas de Templates</h3>
            {templateRows.length === 0 ? (
              <div className="training-ai__chart-empty">Sem dados de templates no período</div>
            ) : (
              <SoftHBarList
                rows={templateRows.map((item) => ({
                  key: item.title,
                  label: item.title,
                  value: item.averageScore,
                  hint: item.simulations === 1 ? '1 simulação' : `${item.simulations} simulações`,
                }))}
                max={100}
                tone="purple"
                formatValue={formatScore}
              />
            )}
          </div>
          <div className="imp-panel">
            <h3>Evolução de Performance em Templates</h3>
            {templateLines.series.length === 0 ? (
              <div className="training-ai__chart-empty">Sem dados de templates no período</div>
            ) : (
              <>
                <ChartLegend series={templateLines.series} />
                <PeriodLineChart
                  points={templateLines.points}
                  days={appliedFilters.days}
                  maxValue={100}
                  ariaLabel="Evolução da nota por template"
                  series={templateLines.series}
                />
                {templateRows.length > MAX_TEMPLATE_LINES ? (
                  <p className="training-ai__meta">
                    Mostrando os {MAX_TEMPLATE_LINES} templates mais usados de {templateRows.length}.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      {activeView === 'comunicacao' && communication ? (
        <div className="training-ai__dash-grid training-ai__dash-grid--communication">
          {[
            {
              id: 'talk',
              label: 'Proporção de Fala e Escuta',
              key: 'talkListenPct',
              tone: 'purple',
              suffix: '%',
              max: 100,
            },
            {
              id: 'pace',
              label: 'Ritmo de Fala',
              key: 'wordsPerMinute',
              tone: 'purple',
              suffix: '',
            },
            {
              id: 'monologue',
              label: 'Maior Monólogo',
              key: 'longestMonologueSec',
              tone: 'purple',
              suffix: 's',
            },
            {
              id: 'fillers',
              label: 'Vícios de Linguagem',
              key: 'fillersPerMinute',
              tone: 'purple',
              suffix: '',
            },
          ].map((metric) => {
            const hasData = communicationSeries.some((row) => row[metric.key] != null)
            return (
              <section key={metric.id} className="imp-panel training-ai__comm-card">
                <div className="training-ai__comm-card-head">
                  <h3>Evolução em Métricas de Comunicação</h3>
                  <p className="training-ai__meta">
                    <span className={`training-ai__dot training-ai__dot--${metric.tone}`} />
                    {metric.label}
                  </p>
                </div>
                {hasData ? (
                  <PeriodLineChart
                    points={communicationSeries}
                    days={appliedFilters.days}
                    valueSuffix={metric.suffix}
                    maxValue={metric.max}
                    ariaLabel={metric.label}
                    series={[{ key: metric.key, label: metric.label, tone: metric.tone }]}
                  />
                ) : (
                  <div className="training-ai__comm-empty">
                    <p>Sem simulações no período</p>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : null}
      </div>
    </TrainingPage>
  )
}
