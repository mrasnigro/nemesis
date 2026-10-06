import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

const TITLES = {
  engajamento: 'Engajamento',
  ranking: 'Ranking',
  performance: 'Performance',
  comunicacao: 'Métricas de comunicação',
}

function Metric({ label, value, hint }) {
  return (
    <article className="imp-metric">
      <p>{label}</p>
      <strong>{value}</strong>
      {hint ? <span>{hint}</span> : null}
    </article>
  )
}

export default function TrainingDashboardsPage() {
  const { view = 'engajamento' } = useParams()
  const { canManage } = useTrainingAi()
  const [days, setDays] = useState(30)
  const [groupId, setGroupId] = useState('')
  const [groups, setGroups] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    trainingApi.listGroups().then((rows) => {
      if (!cancelled) setGroups(rows || [])
    }).catch(() => null)
    return () => {
      cancelled = true
    }
  }, [canManage])

  useEffect(() => {
    let cancelled = false
    trainingApi
      .getDashboards({ days, groupId: groupId || undefined })
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
  }, [days, groupId])

  const engagement = data?.engagement
  const ranking = data?.ranking || []
  const performance = data?.performance
  const communication = data?.communication

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>{TITLES[view] || 'Painel'}</h2>
          <p>Calculado a partir das simulações concluídas.</p>
        </div>
        <div className="training-ai__page-header-actions">
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
          {canManage ? (
            <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">Todos os grupos</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          ) : null}
        </div>
      </header>

      {error ? <p>{error}</p> : null}
      {!data && !error ? <p>Carregando…</p> : null}

      {view === 'engajamento' && engagement ? (
        <div className="imp-module__metrics">
          <Metric label="DAU/MAU" value={`${engagement.dauMau}%`} hint={`${engagement.dau} / ${engagement.mau} pessoas`} />
          <Metric label="DAU/WAU" value={`${engagement.dauWau}%`} />
          <Metric label="WAU/MAU" value={`${engagement.wauMau}%`} />
          <Metric label="Simulações" value={engagement.simulations} />
          <Metric label="Minutos" value={engagement.minutes} />
        </div>
      ) : null}

      {view === 'ranking' && data ? (
        <div className="imp-panel">
          {ranking.length === 0 ? (
            <div className="training-ai__empty"><h3>Nenhuma simulação neste período</h3></div>
          ) : (
            <table className="training-ai__table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Pontuação média</th>
                  <th>Simulações</th>
                  <th>Minutos</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, index) => (
                  <tr key={row.userId}>
                    <td>{index + 1}. {row.userName}</td>
                    <td>{row.averageScore}</td>
                    <td>{row.simulations}</td>
                    <td>{row.minutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {view === 'performance' && performance ? (
        <div className="imp-panel">
          <h3>Por template</h3>
          <ul className="training-ai__list">
            {performance.templates.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong> — média {item.averageScore} · {item.simulations} simulações
              </li>
            ))}
          </ul>
          <h3>Por dia</h3>
          <ul className="training-ai__list">
            {performance.series.map((item) => (
              <li key={item.date}>{item.date}: score {item.averageScore}, {item.minutes} min</li>
            ))}
          </ul>
        </div>
      ) : null}

      {view === 'comunicacao' && communication ? (
        <div className="imp-panel">
          <p className="training-ai__meta">Faixas: fala 40–50%, ritmo 110–150 ppm, monólogo 60–150s, vícios abaixo de 2/min.</p>
          <ul className="training-ai__list">
            {communication.series.map((item) => (
              <li key={item.date}>
                {item.date}: fala {item.talkListenPct}% · {item.wordsPerMinute} ppm · monólogo {item.longestMonologueSec}s · vícios {item.fillersPerMinute}/min
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
