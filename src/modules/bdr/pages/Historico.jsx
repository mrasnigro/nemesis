import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { CALL_SITUATIONS, CLIENT_STATUSES } from '../data/catalogs.js'
import { formatDurationShort } from '../services/formatters.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import '../../../pages/modules/Bdr.css'
import '../styles/bdr-foundation.css'

export default function BdrHistoricoPage() {
  const { history } = useBdrSession()
  const [situation, setSituation] = useState('')
  const [clientStatus, setClientStatus] = useState('')

  const rows = useMemo(() => {
    return history.filter((row) => {
      if (situation && row.callStatus !== situation) return false
      if (clientStatus && row.clientStatus !== clientStatus) return false
      return true
    })
  }, [history, situation, clientStatus])

  return (
    <section className="bdr-section">
      <div className="bdr-discagem__header">
        <h2>Histórico de Chamadas</h2>
        <Link to="/modules/bdr" className="bdr-page__back">
          ← Voltar
        </Link>
      </div>

      <div className="bdr-history-filters">
        <label>
          Filtrar por Situação da Ligação
          <select value={situation} onChange={(e) => setSituation(e.target.value)}>
            <option value="">Todas as situações</option>
            {CALL_SITUATIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filtrar por Status do Cliente
          <select value={clientStatus} onChange={(e) => setClientStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {CLIENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="bdr-history-table-wrap">
        <table className="bdr-history-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Duração</th>
              <th>Situação</th>
              <th>Status Cliente</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.timestamp}</td>
                <td>{row.leadName}</td>
                <td>{row.phone}</td>
                <td>{formatDurationShort(row.duration)}</td>
                <td>{row.callStatus}</td>
                <td>{row.clientStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
