/**
 * Attempts the dialer classified without involving the operator (busy, no answer, voicemail...).
 */
export default function DialAttemptsLog({ rows = [] }) {
  if (!rows.length) return null

  return (
    <section className="bdr-discagem-history" aria-labelledby="bdr-dial-attempts-title">
      <h2 id="bdr-dial-attempts-title" className="bdr-discagem-history__title">
        Tentativas sem atendimento
      </h2>
      <div className="bdr-discagem-history__table-wrap">
        <table className="bdr-discagem-history__table">
          <thead>
            <tr>
              <th>Telefone</th>
              <th>Empresa</th>
              <th>Resultado</th>
              <th>Tentativa</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.phone || '—'}</td>
                <td>{row.company || '—'}</td>
                <td>{row.outcomeLabel}</td>
                <td>{row.attempts ?? '—'}</td>
                <td>{row.at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
