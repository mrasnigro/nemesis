import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import TrainingButton from '../components/TrainingButton.jsx'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

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

function toLocalIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatBrDate(iso) {
  const [year, month, day] = String(iso || '').slice(0, 10).split('-')
  if (!year || !month || !day) return String(iso || '')
  return `${day}/${month}/${year}`
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

function labelStride(pointCount) {
  if (pointCount <= 8) return 1
  if (pointCount <= 16) return 2
  return Math.ceil(pointCount / 8)
}

function fillDailySeries(days, sparseRows, keys) {
  const byDate = new Map((sparseRows || []).map((row) => [String(row.date).slice(0, 10), row]))
  return dateRange(days).map((date) => {
    const row = byDate.get(date)
    const point = { date }
    for (const key of keys) {
      point[key] = row ? Number(row[key]) || 0 : 0
    }
    return point
  })
}

function bucketSeries(days, sparseRows, keys) {
  const daily = fillDailySeries(days, sparseRows, keys)
  const step = pointStep(days)
  if (step <= 1) return daily
  const out = []
  for (let i = 0; i < daily.length; i += step) {
    const chunk = daily.slice(i, Math.min(daily.length, i + step))
    const point = { date: chunk[chunk.length - 1].date }
    for (const key of keys) {
      const sum = chunk.reduce((total, row) => total + (Number(row[key]) || 0), 0)
      point[key] = Math.round((sum / chunk.length) * 10) / 10
    }
    out.push(point)
  }
  return out
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

function niceMax(value) {
  const n = Math.max(Number(value) || 0, 1)
  if (n <= 4) return 4
  if (n <= 10) return 10
  if (n <= 100) return Math.ceil(n / 10) * 10
  return Math.ceil(n / 25) * 25
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

function SimpleBars({ points, valueKey, maxHint, tone = 'orange', days }) {
  const chartPoints = days
    ? bucketSeries(days, points, [valueKey])
    : points
  const values = chartPoints.map((item) => Number(item[valueKey]) || 0)
  const max = Math.max(maxHint || 0, ...values, 1)
  const step = labelStride(chartPoints.length)
  return (
    <div className="training-ai__bars" role="img" aria-label="Gráfico">
      {chartPoints.map((item, index) => {
        const showLabel = index === 0
          || index === chartPoints.length - 1
          || index % step === 0
        return (
          <div key={`${item.date}-${index}`} className="training-ai__bar">
            <span className={`is-${tone}`} style={{ height: `${Math.max(4, (Number(item[valueKey]) / max) * 100)}%` }} />
            {showLabel ? <small>{formatBrDate(item.date)}</small> : <small className="is-blank" />}
          </div>
        )
      })}
    </div>
  )
}

function SimpleLines({ points, series, days, valueSuffix = '' }) {
  const width = 640
  const height = 196
  const padL = 34
  const padR = 10
  const padT = 12
  const padB = 28
  const chartPoints = days
    ? bucketSeries(days, points, series.map((item) => item.key))
    : points
  const allValues = series.flatMap((s) => chartPoints.map((p) => Number(p[s.key]) || 0))
  const max = niceMax(Math.max(...allValues, 0))
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const stepX = chartPoints.length <= 1 ? 0 : plotW / (chartPoints.length - 1)
  const labelStep = labelStride(chartPoints.length)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio * 10) / 10)
  const svgRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  function xAt(index) {
    return padL + index * stepX
  }

  function yAt(value) {
    return padT + plotH - ((Number(value) || 0) / max) * plotH
  }

  function pathFor(key) {
    return chartPoints
      .map((point, index) => {
        const x = xAt(index)
        const y = yAt(point[key])
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  function indexFromClientX(clientX) {
    const svg = svgRef.current
    if (!svg || chartPoints.length === 0) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0) return null
    const localX = ((clientX - rect.left) / rect.width) * width
    const t = (localX - padL) / plotW
    const index = Math.round(Math.max(0, Math.min(1, t)) * (chartPoints.length - 1))
    return index
  }

  function handlePointer(event) {
    setHoverIndex(indexFromClientX(event.clientX))
  }

  const hoverPoint = hoverIndex == null ? null : chartPoints[hoverIndex]
  const hoverX = hoverIndex == null ? null : xAt(hoverIndex)

  return (
    <div className="training-ai__line-chart">
      <div className="training-ai__line-chart-frame">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Série temporal"
          onMouseMove={handlePointer}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={padL}
                y1={yAt(tick)}
                x2={width - padR}
                y2={yAt(tick)}
                className="training-ai__grid"
              />
              <text x={padL - 8} y={yAt(tick) + 3} textAnchor="end" className="training-ai__axis-label">
                {tick}
              </text>
            </g>
          ))}
          <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} className="training-ai__axis" />
          <line x1={padL} y1={padT} x2={padL} y2={height - padB} className="training-ai__axis" />
          {series.map((item) => (
            <path
              key={item.key}
              d={pathFor(item.key)}
              className={`training-ai__line training-ai__line--${item.tone}`}
              fill="none"
            />
          ))}
          {hoverPoint && hoverX != null ? (
            <g className="training-ai__chart-hover">
              <line
                x1={hoverX}
                y1={padT}
                x2={hoverX}
                y2={height - padB}
                className="training-ai__crosshair"
              />
              {series.map((item) => (
                <circle
                  key={`dot-${item.key}`}
                  cx={hoverX}
                  cy={yAt(hoverPoint[item.key])}
                  r={4}
                  className={`training-ai__hover-dot training-ai__hover-dot--${item.tone}`}
                />
              ))}
            </g>
          ) : null}
          {chartPoints.map((point, index) => {
            const show = index === 0
              || index === chartPoints.length - 1
              || index % labelStep === 0
            if (!show) return null
            return (
              <text
                key={`x-${point.date}`}
                x={xAt(index)}
                y={height - 8}
                textAnchor="middle"
                className="training-ai__axis-label"
              >
                {formatBrDate(point.date)}
              </text>
            )
          })}
        </svg>
        {hoverPoint && hoverX != null ? (
          <div
            className="training-ai__chart-tooltip"
            style={{
              left: `${(hoverX / width) * 100}%`,
              transform: hoverX / width > 0.7 ? 'translate(-100%, 0)' : 'translate(8px, 0)',
            }}
          >
            <strong>{formatBrDate(hoverPoint.date)}</strong>
            <ul>
              {series.map((item) => (
                <li key={item.key}>
                  <span className={`training-ai__dot training-ai__dot--${item.tone}`} />
                  {(item.label || item.key)}: {Number(hoverPoint[item.key]) || 0}{valueSuffix}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
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
    trainingApi
      .getDashboards({
        days: appliedFilters.days,
        userId: appliedFilters.scopeType === 'user' && appliedFilters.userId ? appliedFilters.userId : undefined,
        groupId: appliedFilters.scopeType === 'group' && appliedFilters.groupId ? appliedFilters.groupId : undefined,
        personaId: appliedFilters.personaId || undefined,
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
    return () => {
      cancelled = true
    }
  }, [appliedFilters])

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

  const engagementSeries = useMemo(() => {
    const sparse = (engagement?.series || []).map((row) => ({
      date: row.date,
      dauMau: Number(row.dauMau) || 0,
      dauWau: Number(row.dauWau) || 0,
      wauMau: Number(row.wauMau) || 0,
    }))
    return sparse
  }, [engagement])

  const performanceSeries = useMemo(
    () => performance?.series || [],
    [performance],
  )

  const communicationSeries = useMemo(
    () => fillDailySeries(
      appliedFilters.days,
      communication?.series || [],
      ['talkListenPct', 'wordsPerMinute', 'longestMonologueSec', 'fillersPerMinute'],
    ),
    [appliedFilters.days, communication],
  )

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
    const lines = ['view,metric,value']
    if (engagement) {
      lines.push(`engajamento,simulations,${engagement.simulations}`)
      lines.push(`engajamento,minutes,${engagement.minutes}`)
      lines.push(`engajamento,dauMau,${engagement.dauMau}`)
    }
    if (consumption) {
      lines.push(`consumo,simulations,${consumption.simulations}`)
      lines.push(`consumo,minutes,${consumption.minutes}`)
      lines.push(`consumo,averageMinutes,${consumption.averageMinutes}`)
      lines.push(`consumo,activeUsers,${consumption.activeUsers}`)
    }
    ranking.forEach((row, index) => {
      lines.push(`ranking,${index + 1},${row.userName},${row.averageScore}`)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `treinamento-${activeView}.csv`
    a.click()
    URL.revokeObjectURL(url)
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

      {error ? <p>{error}</p> : null}
      {!data && !error ? <p>Carregando…</p> : null}

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
                <SimpleLines
                  points={engagementSeries}
                  days={appliedFilters.days}
                  valueSuffix="%"
                  series={[
                    { key: 'dauMau', label: 'DAU/MAU', tone: 'orange' },
                    { key: 'dauWau', label: 'DAU/WAU', tone: 'purple' },
                    { key: 'wauMau', label: 'WAU/MAU', tone: 'blue' },
                  ]}
                />
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
            <p className="training-ai__meta">
              <span className="training-ai__dot training-ai__dot--purple" /> Média de Notas
              {' · '}
              <span className="training-ai__dot training-ai__dot--orange" /> Média de Minutos
            </p>
            <SimpleBars points={performanceSeries} valueKey="averageScore" tone="purple" days={appliedFilters.days} />
          </div>
          <div className="imp-panel">
            <h3>Evolução de Performance</h3>
            <p className="training-ai__meta"><span className="training-ai__dot training-ai__dot--purple" /> Evolução de Notas</p>
            <SimpleLines
              points={performanceSeries}
              days={appliedFilters.days}
              series={[{ key: 'averageScore', label: 'Média de Notas', tone: 'purple' }]}
            />
          </div>
          <div className="imp-panel">
            <h3>Métricas de Templates</h3>
            {performance.templates.length === 0 ? (
              <p className="training-ai__meta">Sem dados de critérios no período</p>
            ) : (
              <ul className="training-ai__list">
                {performance.templates.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong> — média {item.averageScore} · {item.simulations === 1 ? '1 simulação' : `${item.simulations} simulações`}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="imp-panel">
            <h3>Evolução de Performance em Templates</h3>
            <p className="training-ai__meta"><span className="training-ai__dot training-ai__dot--purple" /> Templates de Avaliação</p>
            <ul className="training-ai__list">
              {performance.templates.map((item) => (
                <li key={`${item.title}-evo`}>{item.title}: {item.averageScore}</li>
              ))}
            </ul>
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
            const hasData = communicationSeries.some((row) => Number(row[metric.key]) > 0)
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
                  <SimpleLines
                    points={communicationSeries}
                    days={appliedFilters.days}
                    valueSuffix={metric.suffix}
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
