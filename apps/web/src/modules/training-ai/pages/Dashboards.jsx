import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import OutlineIcon from '../components/OutlineIcon.jsx'
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
  personaQuery: '',
}

const CREDIT_LIMIT = 30000

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

function nextResetLabel() {
  const reset = new Date()
  reset.setMonth(reset.getMonth() + 1, 1)
  return reset.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function ConsumoCreditsPanel({ consumption, detailed, onToggleDetailed }) {
  const used = Number(consumption?.minutes || 0)
  const limit = CREDIT_LIMIT
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 1000) / 10) : 0
  const markerLeft = `${Math.min(96, Math.max(0, pct))}%`

  return (
    <div className="training-ai__consumo-panel">
      <div className="training-ai__consumo-panel-head">
        <h3>
          Consumo (Créditos/Mês)
          <span className="training-ai__info-dot" title="Créditos mensais usados em simulações (minutos).">i</span>
        </h3>
        <p>Reinicia em {nextResetLabel()}</p>
      </div>

      <div className="training-ai__consumo-meter">
        <div className="training-ai__consumo-track-wrap">
          <span className="training-ai__consumo-bubble" style={{ left: markerLeft }}>
            {String(pct).replace('.', ',')}%
          </span>
          <div className="training-ai__consumo-track" aria-hidden="true">
            <span className="training-ai__consumo-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <strong className="training-ai__consumo-fraction">
          {formatCredits(used)} / {formatCredits(limit)}
        </strong>
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
      lines.push(`consumo,creditsUsed,${consumption.minutes}`)
      lines.push(`consumo,creditsLimit,${CREDIT_LIMIT}`)
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
    patchDraft({ personaQuery: persona.name || '' })
    setPersonaSuggestOpen(false)
  }

  return (
    <section className="imp-module training-ai__dashboards">
      <header className="training-ai__page-header">
        <div>
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
            <button
              type="button"
              className={`imp-btn imp-btn--ghost training-ai__filter-btn ${showFilters ? 'is-active' : ''}`}
              onClick={() => (showFilters ? closeFilters({ discard: true }) : openFilters())}
              aria-expanded={showFilters}
              aria-label="Filtros"
            >
              <OutlineIcon name="filter" />
              <OutlineIcon name="chevron" className="training-ai__outline-icon--chevron" />
            </button>
            <button type="button" className="imp-btn imp-btn--primary" onClick={exportCsv}>
              <OutlineIcon name="export" />
              Exportar
            </button>

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

                  <div
                    className="training-ai__filter-suggest"
                    onBlur={(event) => handleSuggestBlur(event, () => setPersonaSuggestOpen(false))}
                  >
                    <label className="training-ai__filter-field training-ai__filter-field--search">
                      <span className="sr-only">Pesquisar persona</span>
                      <input
                        value={draftFilters.personaQuery}
                        onChange={(event) => {
                          patchDraft({ personaQuery: event.target.value })
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
            <ConsumoCreditsPanel
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
        <div className="imp-panel">
          <h3>Ranking de Usuários</h3>
          {ranking.length === 0 ? (
            <div className="training-ai__empty"><h3>Nenhuma simulação neste período</h3></div>
          ) : (
            <>
              <ul className="training-ai__ranking-list">
                {ranking.map((row, index) => (
                  <li key={row.userId}>
                    <span className="training-ai__rank">{index + 1}º</span>
                    <span className="training-ai__user-avatar">{(row.userName || '?').slice(0, 1)}</span>
                    <div className="training-ai__ranking-meta">
                      <strong>{row.userName}</strong>
                      <div className="training-ai__template-stats">
                        <div>
                          <span className="training-ai__tile-label">Duração média</span>
                          <strong>{row.simulations ? Math.round(row.minutes / row.simulations) : 0} min</strong>
                        </div>
                        <div>
                          <span className="training-ai__tile-label">Simulações</span>
                          <strong>{row.simulations}</strong>
                        </div>
                        <div>
                          <span className="training-ai__tile-label">Pontuação média</span>
                          <strong>{row.averageScore}</strong>
                        </div>
                      </div>
                    </div>
                    <button type="button" className="imp-btn imp-btn--ghost" onClick={() => setSelectedUser(row)}>
                      Detalhes
                    </button>
                  </li>
                ))}
              </ul>
              <div className="training-ai__podium">
                {[ranking[1], ranking[0], ranking[2]].filter(Boolean).map((row) => {
                  const place = ranking.indexOf(row) + 1
                  return (
                    <div key={row.userId} className={`training-ai__podium-step is-${place}`}>
                      <span className="training-ai__user-avatar">{(row.userName || '?').slice(0, 1)}</span>
                      <strong>{place}º</strong>
                      <small>{row.userName}</small>
                      <em>{row.averageScore}</em>
                    </div>
                  )
                })}
              </div>
              {selectedUser ? (
                <p className="training-ai__meta">
                  {selectedUser.userName}: {selectedUser.simulations} simulações, média {selectedUser.averageScore}, {selectedUser.minutes} min.
                </p>
              ) : null}
            </>
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
        <div className="imp-panel">
          <p className="training-ai__meta">Faixas: fala 40–50%, ritmo 110–150 ppm, monólogo 60–150s, vícios abaixo de 2/min.</p>
          <SimpleBars points={communicationSeries} valueKey="talkListenPct" maxHint={100} days={appliedFilters.days} />
          <ul className="training-ai__list">
            {communicationSeries.filter((item) => item.talkListenPct || item.wordsPerMinute).map((item) => (
              <li key={item.date}>
                {formatBrDate(item.date)}: fala {item.talkListenPct}% · {item.wordsPerMinute} ppm · monólogo {item.longestMonologueSec}s · vícios {item.fillersPerMinute}/min
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      </div>
    </section>
  )
}
