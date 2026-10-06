import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { trainingApi } from '../services/api/client.js'
import { scenarioTypeLabel } from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

function scoreTone(score) {
  if (score == null) return 'muted'
  if (score >= 80) return 'green'
  if (score >= 50) return 'amber'
  return 'rose'
}

export default function TrainingHistoryPage() {
  const { canReport, canManage } = useTrainingAi()
  const [scope, setScope] = useState('mine')
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
          <h2>{scope === 'all' ? 'Histórico dos vendedores' : 'Minhas simulações'}</h2>
          <p>Persona, cenário, duração e pontuação de cada conversa concluída.</p>
        </div>
        {canManage ? (
          <div className="training-ai__page-header-actions">
            <button type="button" className={`imp-btn ${scope === 'mine' ? 'imp-btn--primary' : 'imp-btn--ghost'}`} onClick={() => setScope('mine')}>
              Minhas simulações
            </button>
            <button type="button" className={`imp-btn ${scope === 'all' ? 'imp-btn--primary' : 'imp-btn--ghost'}`} onClick={() => setScope('all')}>
              Histórico dos vendedores
            </button>
          </div>
        ) : null}
      </header>

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
      </div>

      {error ? <p>{error}</p> : null}

      <div className="imp-panel">
        {rows.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhuma simulação</h3>
            <p>Conclua um treinamento a partir de uma persona.</p>
          </div>
        ) : (
          <table className="training-ai__table">
            <thead>
              <tr>
                {scope === 'all' ? <th>Usuário</th> : null}
                <th>Persona</th>
                <th>Negociador</th>
                <th>Cenário</th>
                <th>Conclusão</th>
                <th>Tipo</th>
                <th>Pontuação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  {scope === 'all' ? <td>{item.userName || '—'}</td> : null}
                  <td>
                    <Link to={`/modules/training-ai/relatorio/sessao/${item.id}`}>{item.personaName || '—'}</Link>
                  </td>
                  <td>{item.negotiatorType || '—'}</td>
                  <td>{item.scenarioTitle || scenarioTypeLabel(item.scenarioType)}</td>
                  <td>{item.completedAt ? new Date(item.completedAt).toLocaleString('pt-BR') : '—'}</td>
                  <td>{item.mediaMode === 'voice' ? 'Voz' : 'Texto'}</td>
                  <td>
                    <span className={`imp-pill imp-pill--${scoreTone(item.score)}`}>{item.score ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
