import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AgentAvatar from '../components/AgentAvatar.jsx'
import { trainingApi } from '../services/api/client.js'
import { scenarioTypeLabel } from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

function scoreTone(score) {
  if (score == null) return 'muted'
  if (score >= 80) return 'green'
  if (score >= 40) return 'amber'
  return 'rose'
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000))
  const hh = String(Math.floor(total / 3600)).padStart(2, '0')
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
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

export default function TrainingHistoryPage() {
  const { canReport, canManage, getPersona } = useTrainingAi()
  const [scope, setScope] = useState('mine')
  const [showFilters, setShowFilters] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [groupId, setGroupId] = useState('')
  const [groups, setGroups] = useState([])
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    trainingApi.listGroups().then((list) => {
      if (!cancelled) setGroups(list || [])
    }).catch(() => null)
    return () => {
      cancelled = true
    }
  }, [canManage])

  useEffect(() => {
    if (!canReport) return undefined
    let cancelled = false
    trainingApi
      .listSessions({
        scope: canManage && scope === 'all' ? 'all' : 'mine',
        from: from || undefined,
        to: to || undefined,
        groupId: scope === 'all' ? groupId || undefined : undefined,
        pageSize: 50,
      })
      .then((list) => {
        if (!cancelled) {
          setRows(list || [])
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Não foi possível carregar o histórico.')
      })
    return () => {
      cancelled = true
    }
  }, [canManage, canReport, from, groupId, scope, to])

  if (!canReport) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Você não tem acesso ao histórico.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>{scope === 'all' ? 'Histórico dos Vendedores' : 'Minhas Simulações'}</h2>
        </div>
        <div className="training-ai__page-header-actions">
          <button
            type="button"
            className="imp-btn imp-btn--ghost"
            onClick={() => setShowFilters((value) => !value)}
            aria-label="Filtros"
          >
            Filtros
          </button>
          {canManage ? (
            <button
              type="button"
              className="imp-btn imp-btn--primary"
              onClick={() => setScope((value) => (value === 'all' ? 'mine' : 'all'))}
            >
              {scope === 'all' ? 'Minhas simulações' : 'Histórico dos Vendedores'}
            </button>
          ) : null}
        </div>
      </header>

      {showFilters ? (
        <div className="imp-panel training-ai__filters">
          <label className="imp-field">
            <span>De</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="imp-field">
            <span>Até</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          {canManage && scope === 'all' ? (
            <label className="imp-field">
              <span>Grupo</span>
              <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                <option value="">Todos</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" className="imp-btn imp-btn--ghost" onClick={() => { setFrom(''); setTo(''); setGroupId('') }}>
            Limpar
          </button>
          <button type="button" className="imp-btn imp-btn--primary" onClick={() => setShowFilters(false)}>
            Aplicar
          </button>
        </div>
      ) : null}

      {error ? <p>{error}</p> : null}

      <div className="imp-panel">
        {rows.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhuma simulação</h3>
            <p>Conclua um treinamento a partir de uma persona.</p>
          </div>
        ) : (
          <table className="training-ai__table training-ai__table--history">
            <thead>
              <tr>
                {scope === 'all' ? <th>Usuário</th> : null}
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
                    {scope === 'all' ? <td>{item.userName || '—'}</td> : null}
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
                      <span className={`training-ai__type-pill ${item.mediaMode === 'voice' ? 'is-voice' : ''}`}>
                        {item.mediaMode === 'voice' ? '🎙 Voz' : 'Texto'}
                      </span>
                    </td>
                    <td><ScoreRing score={item.score} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
