import { thermometerLabel } from '../data/catalogs.js'
import { formatDurationShort } from '../services/formatters.js'
import { formatDiagnosisSummary } from '../services/historyMapping.js'

/**
 * Call detail panel — qualification, client status, diagnosis, mock actions.
 */
export default function CallHistoryDetail({ row, onClose }) {
  if (!row) return null

  const diagnosisLines = formatDiagnosisSummary(row.diagnosis || {})
  const meetings = row.meetings || []

  const playRecording = () => {
    window.alert(
      row.recordingUrl
        ? `Simulação: reproduzir gravação\n${row.recordingUrl}`
        : 'Nenhuma gravação disponível (mock).',
    )
  }

  const downloadRecording = () => {
    window.alert(
      row.recordingUrl
        ? `Simulação: download da gravação\n${row.recordingUrl}`
        : 'Nenhuma gravação disponível (mock).',
    )
  }

  return (
    <aside className="bdr-history-detail" aria-label="Detalhes da chamada">
      <header className="bdr-history-detail__header">
        <div>
          <h3>Detalhes da chamada</h3>
          <p>{row.timestamp}</p>
        </div>
        <button type="button" className="bdr-modal__close" onClick={onClose}>
          × Fechar
        </button>
      </header>

      <div className="bdr-history-detail__grid">
        <div>
          <span>Cliente</span>
          <strong>{row.leadName}</strong>
        </div>
        <div>
          <span>Empresa</span>
          <strong>{row.company}</strong>
        </div>
        <div>
          <span>Telefone</span>
          <strong>{row.phone}</strong>
        </div>
        <div>
          <span>Protocolo</span>
          <strong>{row.protocol || '—'}</strong>
        </div>
        <div>
          <span>Duração</span>
          <strong>{formatDurationShort(row.duration)}</strong>
        </div>
        <div>
          <span>Método</span>
          <strong>{row.method || '—'}</strong>
        </div>
        <div>
          <span>Situação da ligação</span>
          <strong>{row.callStatus}</strong>
        </div>
        <div>
          <span>Status do cliente</span>
          <strong className="bdr-history-status">{row.clientStatus}</strong>
        </div>
        <div>
          <span>Qualificação (Vw)</span>
          <strong>{row.qualification || '—'}</strong>
        </div>
        <div>
          <span>E-mail</span>
          <strong>{row.email || '—'}</strong>
        </div>
        <div>
          <span>CNPJ</span>
          <strong>{row.cnpj || '—'}</strong>
        </div>
        <div>
          <span>Endereço</span>
          <strong>
            {[row.address, row.city, row.state].filter(Boolean).join(' · ') || '—'}
          </strong>
        </div>
      </div>

      <section className="bdr-history-detail__block">
        <h4>Notas</h4>
        <p>{row.notes || 'Sem notas registradas.'}</p>
      </section>

      <section className="bdr-history-detail__block">
        <h4>Diagnóstico</h4>
        {diagnosisLines.length ? (
          <ul>
            {diagnosisLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p>Sem diagnóstico estruturado.</p>
        )}
        {row.diagnosis?.needs ? (
          <p>
            <em>Necessidades:</em> {row.diagnosis.needs}
          </p>
        ) : null}
        {row.diagnosis?.objections ? (
          <p className="bdr-history-detail__pre">{row.diagnosis.objections}</p>
        ) : null}
        {row.diagnosis?.conversationSummary ? (
          <p>
            <em>Resumo:</em> {row.diagnosis.conversationSummary}
          </p>
        ) : null}
        {typeof row.diagnosis?.salesTemperature === 'number' ? (
          <p>
            Termômetro:{' '}
            <strong>
              {row.diagnosis.salesTemperature}% · {thermometerLabel(row.diagnosis.salesTemperature)}
            </strong>
          </p>
        ) : null}
      </section>

      {meetings.length ? (
        <section className="bdr-history-detail__block">
          <h4>Reuniões vinculadas</h4>
          <ul>
            {meetings.map((m) => (
              <li key={m.id}>
                {m.date} {m.time} — {m.company} ({m.protocol})
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="bdr-history-detail__actions">
        <button type="button" onClick={playRecording}>
          Ouvir gravação
        </button>
        <button type="button" onClick={downloadRecording}>
          Baixar gravação
        </button>
        {row.phone ? (
          <a className="bdr-history-detail__link" href={`tel:${row.phone.replace(/\D/g, '')}`}>
            Contato
          </a>
        ) : null}
      </div>
    </aside>
  )
}
