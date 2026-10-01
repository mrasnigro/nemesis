import { formatDurationHHMMSS } from '../services/formatters.js'

function formatDurationClock(totalSeconds) {
  return formatDurationHHMMSS(totalSeconds).slice(3)
}

/**
 * Session call history strip on Discagem — shown after Finalizar Atendimento.
 * Columns match sample Vw: Telefone, Empresa, Qualificação, Duração, Método, Data/Hora.
 */
export default function DiscagemCallHistory({ rows = [] }) {
  if (!rows.length) return null

  return (
    <section className="bdr-discagem-history" aria-labelledby="bdr-discagem-history-title">
      <h2 id="bdr-discagem-history-title" className="bdr-discagem-history__title">
        Histórico de Chamadas
      </h2>
      <div className="bdr-discagem-history__table-wrap">
        <table className="bdr-discagem-history__table">
          <thead>
            <tr>
              <th>Telefone</th>
              <th>Empresa</th>
              <th>Qualificação</th>
              <th>Duração</th>
              <th>Método</th>
              <th>Data/Hora</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.phone || '—'}</td>
                <td>{row.company || '—'}</td>
                <td>{row.qualification || ''}</td>
                <td>{formatDurationClock(row.duration)}</td>
                <td>{row.method || '—'}</td>
                <td>{row.timestamp || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
