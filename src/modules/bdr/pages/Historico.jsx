import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import CallHistoryDetail from '../components/CallHistoryDetail.jsx'
import { CALL_SITUATIONS, CLIENT_STATUSES } from '../data/catalogs.js'
import { formatDurationShort } from '../services/formatters.js'
import { filterHistoryRows } from '../services/historyMapping.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import '../../../pages/modules/Bdr.css'
import '../styles/bdr-foundation.css'

function ActionIcon({ name }) {
  const icons = {
    notes: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 14H5.17L4 17.17V4h16v12z"
        />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"
        />
      </svg>
    ),
    play: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M8 5v14l11-7L8 5z" />
      </svg>
    ),
    download: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5 20h14v-2H5v2zm7-18-5.5 5.5h3.5V15h4V7.5h3.5L12 2z"
        />
      </svg>
    ),
  }
  return <span className="bdr-history-actions__icon">{icons[name]}</span>
}

/** Normalize seed timestamps toward sample `YYYY-MM-DD HH:mm`. */
function formatHistoryTimestamp(value) {
  if (!value) return '—'
  const br = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})/)
  if (br) return `${br[3]}-${br[2]}-${br[1]} ${br[4]}:${br[5]}`
  return String(value).replace('T', ' ').slice(0, 16)
}

function situationTone(status) {
  if (status === 'Atendida') return 'answered'
  if (status === 'Não atendida') return 'missed'
  return 'default'
}

export default function BdrHistoricoPage() {
  const { history } = useBdrSession()
  const [situation, setSituation] = useState('')
  const [clientStatus, setClientStatus] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const rows = useMemo(
    () => filterHistoryRows(history, { situation, clientStatus }),
    [history, situation, clientStatus],
  )

  const selected = history.find((r) => r.id === selectedId) || null

  const playRecording = (row, e) => {
    e.stopPropagation()
    window.alert(
      row.recordingUrl
        ? `Simulação: reproduzir gravação\n${row.recordingUrl}`
        : 'Nenhuma gravação disponível (mock).',
    )
  }

  const downloadRecording = (row, e) => {
    e.stopPropagation()
    window.alert(
      row.recordingUrl
        ? `Simulação: download\n${row.recordingUrl}`
        : 'Nenhuma gravação disponível (mock).',
    )
  }

  return (
    <section className="bdr-section bdr-history">
      <div className="bdr-discagem__header bdr-discagem__header--toolbar">
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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={selectedId === row.id ? 'is-selected' : ''}>
                <td>{formatHistoryTimestamp(row.timestamp)}</td>
                <td>
                  <strong className="bdr-history-client-name">{row.leadName}</strong>
                </td>
                <td>{row.phone}</td>
                <td>{formatDurationShort(row.duration)}</td>
                <td>
                  <span
                    className={`bdr-history-pill bdr-history-pill--${situationTone(row.callStatus)}`}
                  >
                    {row.callStatus}
                  </span>
                </td>
                <td>
                  <span className="bdr-history-status">{row.clientStatus}</span>
                </td>
                <td>
                  <div className="bdr-history-actions">
                    <button
                      type="button"
                      title="Notas / detalhes"
                      aria-label="Notas"
                      onClick={() => setSelectedId(row.id)}
                    >
                      <ActionIcon name="notes" />
                    </button>
                    <a
                      href={`tel:${String(row.phone || '').replace(/\D/g, '')}`}
                      title="Contato"
                      aria-label="Contato"
                    >
                      <ActionIcon name="user" />
                    </a>
                    <button
                      type="button"
                      title="Ouvir gravação"
                      aria-label="Ouvir gravação"
                      onClick={(e) => playRecording(row, e)}
                    >
                      <ActionIcon name="play" />
                    </button>
                    <button
                      type="button"
                      title="Baixar gravação"
                      aria-label="Baixar gravação"
                      onClick={(e) => downloadRecording(row, e)}
                    >
                      <ActionIcon name="download" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhuma chamada para os filtros selecionados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="bdr-history-detail-slot">
          <CallHistoryDetail row={selected} onClose={() => setSelectedId(null)} />
        </div>
      ) : null}
    </section>
  )
}
