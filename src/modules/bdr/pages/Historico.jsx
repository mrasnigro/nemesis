import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import CallHistoryDetail from '../components/CallHistoryDetail.jsx'
import { CALL_SITUATIONS, CLIENT_STATUSES } from '../data/catalogs.js'
import { formatDurationShort } from '../services/formatters.js'
import { filterHistoryRows } from '../services/historyMapping.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import '../../../pages/modules/Bdr.css'
import '../styles/bdr-foundation.css'

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

      <p className="bdr-script__hint">
        {rows.length} chamada(s) · conclusões da Discagem aparecem no topo na mesma sessão.
      </p>

      <div className="bdr-history-layout">
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
                <th>Qualificação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={selectedId === row.id ? 'is-selected' : ''}
                  onClick={() => setSelectedId(row.id)}
                >
                  <td>{row.timestamp}</td>
                  <td>
                    <div className="bdr-history-client">
                      <strong>{row.leadName}</strong>
                      <span>{row.company}</span>
                    </div>
                  </td>
                  <td>{row.phone}</td>
                  <td>{formatDurationShort(row.duration)}</td>
                  <td>{row.callStatus}</td>
                  <td>
                    <span className="bdr-history-status">{row.clientStatus}</span>
                  </td>
                  <td>{row.qualification}</td>
                  <td>
                    <div className="bdr-history-actions">
                      <button
                        type="button"
                        title="Notas / detalhes"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedId(row.id)
                        }}
                      >
                        📝
                      </button>
                      <a
                        href={`tel:${String(row.phone || '').replace(/\D/g, '')}`}
                        title="Contato"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📞
                      </a>
                      <button
                        type="button"
                        title="Ouvir gravação"
                        onClick={(e) => playRecording(row, e)}
                      >
                        ▶
                      </button>
                      <button
                        type="button"
                        title="Baixar gravação"
                        onClick={(e) => downloadRecording(row, e)}
                      >
                        ⬇
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>Nenhuma chamada para os filtros selecionados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {selected ? (
          <CallHistoryDetail row={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <aside className="bdr-history-detail bdr-history-detail--empty">
            <p>Selecione uma chamada para ver diagnóstico, qualificação e detalhes.</p>
          </aside>
        )}
      </div>
    </section>
  )
}
