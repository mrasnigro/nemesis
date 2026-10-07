import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import TrainingButton from '../components/TrainingButton.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import AgentAvatar from '../components/AgentAvatar.jsx'
import { trainingApi } from '../services/api/client.js'
import { scenarioTypeLabel } from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { formatBrDate, formatDuration, toLocalIsoDate } from '../utils/dates.js'
import { downloadCsv } from '../utils/download.js'

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const HISTORY_PAGE_SIZE = 50

const EMPTY_FILTERS = {
  from: '',
  to: '',
  scopeType: 'user',
  userId: '',
  groupId: '',
  query: '',
}

function scoreTone(score) {
  if (score == null) return 'muted'
  if (score >= 80) return 'green'
  if (score >= 40) return 'amber'
  return 'rose'
}

function ScoreRing({ score }) {
  const value = Number(score) || 0
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference
  return (
    <span className={`training-ai__score-ring training-ai__score-ring--${scoreTone(value)}`} title={`${value}`}>
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={radius} className="training-ai__score-ring-track" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          className="training-ai__score-ring-value"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <strong>{value}</strong>
    </span>
  )
}

function buildCalendarCells(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = startOffset - 1; i >= 0; i -= 1) {
    const day = prevDays - i
    cells.push({
      day,
      iso: toLocalIsoDate(new Date(year, month - 1, day)),
      outside: true,
    })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      iso: toLocalIsoDate(new Date(year, month, day)),
      outside: false,
    })
  }
  const trailing = (7 - (cells.length % 7)) % 7
  for (let day = 1; day <= trailing; day += 1) {
    cells.push({
      day,
      iso: toLocalIsoDate(new Date(year, month + 1, day)),
      outside: true,
    })
  }
  return cells
}

function MonthCalendar({
  monthDate,
  selectedFrom,
  selectedTo,
  onPick,
  monthMenuOpen,
  yearMenuOpen,
  onToggleMonthMenu,
  onToggleYearMenu,
  onSelectMonth,
  onSelectYear,
}) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const cells = buildCalendarCells(monthDate)
  const years = Array.from({ length: 12 }, (_, index) => year + 3 - index)

  return (
    <div className="training-ai__history-calendar">
      <div className="training-ai__history-calendar-nav">
        <div className="training-ai__history-calendar-select">
          <button
            type="button"
            className={`training-ai__history-calendar-trigger ${monthMenuOpen ? 'is-open' : ''}`}
            onClick={onToggleMonthMenu}
            aria-expanded={monthMenuOpen}
          >
            {MONTHS[month]}
            <span aria-hidden="true">▾</span>
          </button>
          {monthMenuOpen ? (
            <ul className="training-ai__history-calendar-menu">
              {MONTHS.map((label, index) => (
                <li key={label}>
                  <button
                    type="button"
                    className={index === month ? 'is-selected' : ''}
                    onClick={() => onSelectMonth(index)}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="training-ai__history-calendar-select">
          <button
            type="button"
            className={`training-ai__history-calendar-trigger ${yearMenuOpen ? 'is-open' : ''}`}
            onClick={onToggleYearMenu}
            aria-expanded={yearMenuOpen}
          >
            {year}
            <span aria-hidden="true">▾</span>
          </button>
          {yearMenuOpen ? (
            <ul className="training-ai__history-calendar-menu training-ai__history-calendar-menu--years">
              {years.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className={item === year ? 'is-selected' : ''}
                    onClick={() => onSelectYear(item)}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="training-ai__history-calendar-weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="training-ai__history-calendar-grid">
        {cells.map((cell) => {
          const selected = cell.iso === selectedFrom || cell.iso === selectedTo
          const inRange = Boolean(
            selectedFrom
            && selectedTo
            && cell.iso > selectedFrom
            && cell.iso < selectedTo,
          )
          return (
            <button
              key={cell.iso}
              type="button"
              className={[
                'training-ai__history-calendar-day',
                cell.outside ? 'is-outside' : '',
                selected ? 'is-selected' : '',
                inRange ? 'is-in-range' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onPick(cell.iso)}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function TrainingHistoryPage() {
  const { canReport, canManage, getPersona } = useTrainingAi()
  const [scope, setScope] = useState('mine')
  const [showFilters, setShowFilters] = useState(false)
  const [applied, setApplied] = useState(EMPTY_FILTERS)
  const [draft, setDraft] = useState(EMPTY_FILTERS)
  const [dateFocus, setDateFocus] = useState('from')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [monthMenuOpen, setMonthMenuOpen] = useState(false)
  const [yearMenuOpen, setYearMenuOpen] = useState(false)
  const [scopeSuggestOpen, setScopeSuggestOpen] = useState(false)
  const [groups, setGroups] = useState([])
  const [people, setPeople] = useState([])
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    Promise.all([
      trainingApi.listGroups().catch(() => []),
      trainingApi.listDirectory().catch(() => []),
    ]).then(([nextGroups, nextPeople]) => {
      if (cancelled) return
      setGroups(nextGroups || [])
      setPeople(nextPeople || [])
    })
    return () => {
      cancelled = true
    }
  }, [canManage])

  useEffect(() => {
    setPage(1)
  }, [applied, scope])

  useEffect(() => {
    if (!canReport) return undefined
    let cancelled = false
    const listScope = canManage && scope === 'all' ? 'all' : 'mine'
    trainingApi
      .listSessions({
        scope: listScope,
        from: applied.from || undefined,
        to: applied.to || undefined,
        groupId: listScope === 'all' && applied.scopeType === 'group' ? applied.groupId || undefined : undefined,
        userId: listScope === 'all' && applied.scopeType === 'user' ? applied.userId || undefined : undefined,
        page,
        pageSize: HISTORY_PAGE_SIZE,
      })
      .then((payload) => {
        if (!cancelled) {
          setRows(payload?.data || [])
          setTotal(Number(payload?.page?.total || 0))
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Não foi possível carregar o histórico.')
      })
    return () => {
      cancelled = true
    }
  }, [applied, canManage, canReport, page, scope])

  const filteredSuggestions = useMemo(() => {
    const term = draft.query.trim().toLowerCase()
    if (draft.scopeType === 'group') {
      const list = groups || []
      if (!term) return list.slice(0, 8)
      return list.filter((group) => String(group.name || '').toLowerCase().includes(term)).slice(0, 8)
    }
    const list = people || []
    if (!term) return list.slice(0, 8)
    return list
      .filter((person) => `${person.name || ''} ${person.email || ''}`.toLowerCase().includes(term))
      .slice(0, 8)
  }, [draft.query, draft.scopeType, groups, people])

  function patchDraft(patch) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function openFilters() {
    setDraft(applied)
    setShowFilters(true)
    setDateFocus('from')
    setMonthMenuOpen(false)
    setYearMenuOpen(false)
    const seed = applied.from || applied.to
    if (seed) {
      const [y, m] = seed.split('-').map(Number)
      setCalendarMonth(new Date(y, m - 1, 1))
    }
  }

  function closeFilters() {
    setShowFilters(false)
    setMonthMenuOpen(false)
    setYearMenuOpen(false)
    setScopeSuggestOpen(false)
  }

  function handleScopeSuggestBlur(event) {
    const next = event.relatedTarget
    if (next && event.currentTarget.contains(next)) return
    window.setTimeout(() => setScopeSuggestOpen(false), 0)
  }

  function pickCalendarDay(iso) {
    setMonthMenuOpen(false)
    setYearMenuOpen(false)
    const [y, m] = iso.split('-').map(Number)
    setCalendarMonth(new Date(y, m - 1, 1))
    if (dateFocus === 'from') {
      patchDraft({
        from: iso,
        to: draft.to && draft.to < iso ? '' : draft.to,
      })
      setDateFocus('to')
      return
    }
    if (draft.from && iso < draft.from) {
      patchDraft({ from: iso, to: draft.from })
      setDateFocus('from')
      return
    }
    patchDraft({ to: iso })
  }

  function clearDraft() {
    setDraft(EMPTY_FILTERS)
    setDateFocus('from')
  }

  function applyFilters() {
    setApplied(draft)
    setShowFilters(false)
    setMonthMenuOpen(false)
    setYearMenuOpen(false)
  }

  function exportCsv() {
    const lines = ['usuario,persona,negociador,cenario,conclusao,duracao,tipo,pontuacao']
    for (const item of rows) {
      const persona = item.personaId ? getPersona(item.personaId) : null
      lines.push([
        item.userName || '',
        item.personaName || '',
        item.negotiatorType || persona?.negotiatorType || '',
        item.scenarioTitle || scenarioTypeLabel(persona?.scenarioType),
        item.completedAt || '',
        formatDuration(item.durationMs),
        item.mediaMode === 'voice' ? 'voz' : 'texto',
        item.score ?? '',
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    }
    downloadCsv(`historico-simulacoes-${toLocalIsoDate(new Date())}.csv`, lines)
  }

  const pageCount = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE) || 1)
  const safePage = Math.min(page, pageCount)

  if (!canReport) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Você não tem acesso ao histórico.</p>
        </div>
      </TrainingPage>
    )
  }

  const showUserColumn = canManage && scope === 'all'

  return (
    <TrainingPage className="training-ai__history-page">
      <header className="training-ai__page-header">
        <div className="training-ai__page-title-row">
          <OutlineIcon name="notebook" />
          <h2>{scope === 'all' ? 'Histórico de Simulações' : 'Minhas Simulações'}</h2>
        </div>
      </header>

      {error ? <p>{error}</p> : null}

      <div className="imp-panel training-ai__history-stage">
        <div className="training-ai__history-toolbar">
          <div className="training-ai__history-actions">
            <div className="training-ai__history-filter-wrap">
              <TrainingButton
                variant="ghost"
                iconOnly
                active={showFilters}
                aria-label="Filtros"
                aria-expanded={showFilters}
                onClick={() => (showFilters ? closeFilters() : openFilters())}
              >
                <OutlineIcon name="filter" />
              </TrainingButton>

              {showFilters ? (
                <div
                  className="training-ai__history-filter-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Filtros – Histórico de Simulação"
                >
                  <button
                    type="button"
                    className="training-ai__filter-backdrop"
                    aria-label="Fechar filtros"
                    onClick={closeFilters}
                  />
                  <div className="training-ai__history-filter-panel">
                    <div className="training-ai__history-filter-head">
                      <OutlineIcon name="filter" />
                      <strong>Filtros – Histórico de Simulação</strong>
                    </div>

                    <div className="training-ai__history-filter-section">
                      <h4>Filtro por data</h4>
                      <div className="training-ai__history-date-fields">
                        <label className={`training-ai__history-date-field ${dateFocus === 'from' ? 'is-active' : ''}`}>
                          <span className="sr-only">De</span>
                          <input
                            readOnly
                            value={draft.from ? formatBrDate(draft.from) : ''}
                            placeholder="De..."
                            onFocus={() => setDateFocus('from')}
                            onClick={() => setDateFocus('from')}
                          />
                          <OutlineIcon name="calendar" />
                        </label>
                        <label className={`training-ai__history-date-field ${dateFocus === 'to' ? 'is-active' : ''}`}>
                          <span className="sr-only">Até</span>
                          <input
                            readOnly
                            value={draft.to ? formatBrDate(draft.to) : ''}
                            placeholder="Até..."
                            onFocus={() => setDateFocus('to')}
                            onClick={() => setDateFocus('to')}
                          />
                          <OutlineIcon name="calendar" />
                        </label>
                      </div>

                      <MonthCalendar
                        monthDate={calendarMonth}
                        selectedFrom={draft.from}
                        selectedTo={draft.to}
                        onPick={pickCalendarDay}
                        monthMenuOpen={monthMenuOpen}
                        yearMenuOpen={yearMenuOpen}
                        onToggleMonthMenu={() => {
                          setMonthMenuOpen((open) => !open)
                          setYearMenuOpen(false)
                        }}
                        onToggleYearMenu={() => {
                          setYearMenuOpen((open) => !open)
                          setMonthMenuOpen(false)
                        }}
                        onSelectMonth={(monthIndex) => {
                          setCalendarMonth((current) => new Date(current.getFullYear(), monthIndex, 1))
                          setMonthMenuOpen(false)
                        }}
                        onSelectYear={(nextYear) => {
                          setCalendarMonth((current) => new Date(nextYear, current.getMonth(), 1))
                          setYearMenuOpen(false)
                        }}
                      />
                    </div>

                    {canManage && scope === 'all' ? (
                      <div className="training-ai__history-filter-section">
                        <h4>Filtro por usuário ou grupo</h4>
                        <div className="training-ai__history-scope-toggle" role="group" aria-label="Escopo">
                          <button
                            type="button"
                            className={draft.scopeType === 'group' ? 'is-active' : ''}
                            onClick={() => {
                              patchDraft({ scopeType: 'group', userId: '', query: '' })
                              setScopeSuggestOpen(false)
                            }}
                          >
                            <OutlineIcon name="users" />
                            Grupos
                          </button>
                          <button
                            type="button"
                            className={draft.scopeType === 'user' ? 'is-active' : ''}
                            onClick={() => {
                              patchDraft({ scopeType: 'user', groupId: '', query: '' })
                              setScopeSuggestOpen(false)
                            }}
                          >
                            <OutlineIcon name="user" />
                            Usuários
                          </button>
                        </div>

                        <div
                          className="training-ai__history-scope-suggest"
                          onBlur={handleScopeSuggestBlur}
                        >
                          <label className="training-ai__search training-ai__search--action training-ai__history-scope-search">
                            <span className="sr-only">
                              {draft.scopeType === 'group' ? 'Pesquisar grupo' : 'Pesquisar usuário'}
                            </span>
                            <input
                              value={draft.query}
                              onChange={(event) => {
                                patchDraft({
                                  query: event.target.value,
                                  ...(draft.scopeType === 'group' ? { groupId: '' } : { userId: '' }),
                                })
                                setScopeSuggestOpen(true)
                              }}
                              onFocus={() => setScopeSuggestOpen(true)}
                              onClick={() => setScopeSuggestOpen(true)}
                              placeholder={draft.scopeType === 'group' ? 'Pesquisar grupo...' : 'Pesquisar usuário...'}
                              autoComplete="off"
                            />
                            <span className="training-ai__search-btn" aria-hidden="true">
                              <OutlineIcon name="search" />
                            </span>
                          </label>

                          {scopeSuggestOpen ? (
                            <div className="training-ai__history-suggest-panel">
                              <div className="training-ai__history-suggest-head">
                                <OutlineIcon name={draft.scopeType === 'group' ? 'users' : 'user'} />
                                <strong>{draft.scopeType === 'group' ? 'Grupos' : 'Usuários'}</strong>
                              </div>
                              <ul className="training-ai__history-suggest-list">
                                {filteredSuggestions.length === 0 ? (
                                  <li className="is-empty">
                                    {draft.scopeType === 'group' ? 'Nenhum grupo' : 'Nenhum usuário'}
                                  </li>
                                ) : (
                                  filteredSuggestions.map((item) => {
                                    const selected = draft.scopeType === 'group'
                                      ? draft.groupId === item.id
                                      : draft.userId === item.id
                                    return (
                                      <li key={item.id}>
                                        <button
                                          type="button"
                                          className={selected ? 'is-selected' : ''}
                                          onMouseDown={(event) => event.preventDefault()}
                                          onClick={() => {
                                            if (draft.scopeType === 'group') {
                                              patchDraft({ groupId: item.id, userId: '', query: item.name || '' })
                                            } else {
                                              patchDraft({ userId: item.id, groupId: '', query: item.name || '' })
                                            }
                                            setScopeSuggestOpen(false)
                                          }}
                                        >
                                          {item.name}
                                        </button>
                                      </li>
                                    )
                                  })
                                )}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="training-ai__history-filter-footer">
                      <button type="button" className="imp-btn training-ai__btn-cancel" onClick={clearDraft}>
                        Limpar
                      </button>
                      <TrainingButton type="button" variant="primary" onClick={applyFilters}>
                        Aplicar
                      </TrainingButton>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <TrainingButton variant="primary" onClick={exportCsv}>
              <OutlineIcon name="export" />
              Exportar
            </TrainingButton>

            {canManage ? (
              <TrainingButton
                variant="primary"
                onClick={() => setScope((value) => (value === 'all' ? 'mine' : 'all'))}
              >
                {scope === 'all' ? 'Minhas Simulações' : 'Histórico de Simulações'}
              </TrainingButton>
            ) : (
              <TrainingButton variant="primary" disabled>
                Minhas Simulações
              </TrainingButton>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhuma simulação</h3>
            <p>Conclua um treinamento a partir de uma persona.</p>
          </div>
        ) : (
          <div className="training-ai__history-table-wrap">
            <table className="training-ai__table training-ai__table--history">
              <thead>
                <tr>
                  {showUserColumn ? <th>Usuário</th> : null}
                  <th>Persona</th>
                  <th>Negociador</th>
                  <th>Cenário</th>
                  <th>Conclusão</th>
                  <th>Duração</th>
                  <th>Tipo</th>
                  <th>Pontuação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const persona = item.personaId ? getPersona(item.personaId) : null
                  return (
                    <tr key={item.id}>
                      {showUserColumn ? (
                        <td>
                          <span className="training-ai__history-user">
                            <span className="training-ai__user-avatar">{(item.userName || '?').slice(0, 1)}</span>
                            <strong>{item.userName || '—'}</strong>
                          </span>
                        </td>
                      ) : null}
                      <td>
                        <Link className="training-ai__history-persona" to={`/modules/training-ai/relatorio/sessao/${item.id}`}>
                          <AgentAvatar
                            id={item.personaId || item.id}
                            name={item.personaName || '—'}
                            size="sm"
                            photo={persona?.avatarData}
                          />
                          <span>
                            <strong>{item.personaName || '—'}</strong>
                            <small>{persona?.location || ''}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{item.negotiatorType || persona?.negotiatorType || '—'}</td>
                      <td>{item.scenarioTitle || scenarioTypeLabel(persona?.scenarioType)}</td>
                      <td>
                        {item.completedAt
                          ? new Date(item.completedAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }).replace(',', ' às')
                          : '—'}
                      </td>
                      <td>{formatDuration(item.durationMs)}</td>
                      <td>
                        <span className={`training-ai__type-pill ${item.mediaMode === 'voice' ? 'is-voice' : 'is-text'}`}>
                          <OutlineIcon name={item.mediaMode === 'voice' ? 'phone' : 'chat'} />
                          {item.mediaMode === 'voice' ? 'Voz' : 'Texto'}
                        </span>
                      </td>
                      <td><ScoreRing score={item.score} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {total > HISTORY_PAGE_SIZE ? (
              <div className="training-ai__history-pagination">
                <p className="training-ai__meta">
                  Mostrando {(safePage - 1) * HISTORY_PAGE_SIZE + 1}–
                  {Math.min(safePage * HISTORY_PAGE_SIZE, total)} de {total}
                </p>
                <div className="training-ai__group-pagination" aria-label="Paginação do histórico">
                  <button type="button" disabled={safePage <= 1} onClick={() => setPage(1)} aria-label="Primeira página">
                    <OutlineIcon name="chevronsLeft" />
                  </button>
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    aria-label="Página anterior"
                  >
                    <OutlineIcon name="chevron" className="is-flip" />
                  </button>
                  <span className="training-ai__group-page-current">{safePage}</span>
                  <button
                    type="button"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    aria-label="Próxima página"
                  >
                    <OutlineIcon name="chevron" />
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage(pageCount)}
                    aria-label="Última página"
                  >
                    <OutlineIcon name="chevronsRight" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </TrainingPage>
  )
}
