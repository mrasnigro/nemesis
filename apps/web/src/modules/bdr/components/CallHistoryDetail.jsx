import { useEffect, useState } from 'react'
import { thermometerLabel } from '../data/catalogs.js'
import { bdrRepository } from '../services/bdrRepository.js'
import { formatDurationShort } from '../services/formatters.js'
import { formatDiagnosisSummary } from '../services/historyMapping.js'

const SUMMARY_RECHECK_MS = 10_000

const SUMMARY_SOURCE_LABELS = {
  ai_audio: 'Gerado por IA a partir da gravação e do registro',
  ai: 'Gerado por IA a partir do registro do atendimento',
  record: 'Montado a partir do registro do atendimento',
}

function summaryNote(summary) {
  if (summary.status === 'pending') {
    return summary.source === 'record'
      ? 'Resumo com IA em preparação — esta tela atualiza sozinha.'
      : 'Nova versão com a gravação em preparação.'
  }
  if (summary.status === 'failed' && summary.source === 'record') {
    return 'O resumo com IA não pôde ser gerado; exibindo o resumo do registro.'
  }
  return SUMMARY_SOURCE_LABELS[summary.source] ?? ''
}

/**
 * Call detail panel — summary, qualification, client status, diagnosis, linked meetings,
 * recording and transcript. The detail is re-read on open so the summary is current.
 */
export default function CallHistoryDetail({ row, onClose }) {
  const [detail, setDetail] = useState(null)
  const rowId = row?.id

  useEffect(() => {
    if (!rowId) return undefined
    let active = true
    let timer = null
    const load = () =>
      bdrRepository
        .getCall(rowId)
        .then((call) => {
          if (!active) return
          setDetail(call)
          if (call?.summary?.status === 'pending') timer = setTimeout(load, SUMMARY_RECHECK_MS)
        })
        .catch(() => null)
    load()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [rowId])

  if (!row) return null
  const call = detail?.id === row.id ? { ...row, ...detail } : row
  const summary = call.summary

  const diagnosisLines = formatDiagnosisSummary(call.diagnosis || {})
  const meetings = call.meetings || []

  const recordingNote =
    call.recordingStatus === 'pending'
      ? 'Gravação sendo copiada da central telefônica…'
      : 'Nenhuma gravação disponível para esta ligação.'

  return (
    <aside className="bdr-history-detail" aria-label="Detalhes da chamada">
      <header className="bdr-history-detail__header">
        <div>
          <h3>Detalhes da chamada</h3>
          <p>{call.timestamp}</p>
        </div>
        <button type="button" className="bdr-modal__close" onClick={onClose}>
          × Fechar
        </button>
      </header>

      <div className="bdr-history-detail__grid">
        <div>
          <span>Cliente</span>
          <strong>{call.leadName}</strong>
        </div>
        <div>
          <span>Empresa</span>
          <strong>{call.company}</strong>
        </div>
        <div>
          <span>Telefone</span>
          <strong>{call.phone}</strong>
        </div>
        <div>
          <span>Protocolo</span>
          <strong>{call.protocol || '—'}</strong>
        </div>
        <div>
          <span>Duração</span>
          <strong>{formatDurationShort(call.duration)}</strong>
        </div>
        <div>
          <span>Método</span>
          <strong>{call.method || '—'}</strong>
        </div>
        <div>
          <span>Situação da ligação</span>
          <strong>{call.callStatus}</strong>
        </div>
        <div>
          <span>Status do cliente</span>
          <strong className="bdr-history-status">{call.clientStatus}</strong>
        </div>
        <div>
          <span>Qualificação (Vw)</span>
          <strong>{call.qualification || '—'}</strong>
        </div>
        <div>
          <span>E-mail</span>
          <strong>{call.email || '—'}</strong>
        </div>
        <div>
          <span>CNPJ</span>
          <strong>{call.cnpj || '—'}</strong>
        </div>
        <div>
          <span>Endereço</span>
          <strong>
            {[call.address, call.city, call.state].filter(Boolean).join(' · ') || '—'}
          </strong>
        </div>
      </div>

      {summary?.text ? (
        <section className="bdr-history-detail__block bdr-history-detail__summary">
          <h4>Resumo do atendimento</h4>
          <p className="bdr-history-detail__summary-note">{summaryNote(summary)}</p>
          <p className="bdr-history-detail__lines">{summary.text}</p>
        </section>
      ) : null}

      <section className="bdr-history-detail__block">
        <h4>Notas</h4>
        <p>{call.notes || 'Sem notas registradas.'}</p>
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
        {call.diagnosis?.needs ? (
          <p>
            <em>Necessidades:</em> {call.diagnosis.needs}
          </p>
        ) : null}
        {call.diagnosis?.objections ? (
          <p className="bdr-history-detail__pre">{call.diagnosis.objections}</p>
        ) : null}
        {call.diagnosis?.conversationSummary ? (
          <p>
            <em>Resumo:</em> {call.diagnosis.conversationSummary}
          </p>
        ) : null}
        {typeof call.diagnosis?.salesTemperature === 'number' ? (
          <p>
            Termômetro:{' '}
            <strong>
              {call.diagnosis.salesTemperature}% · {thermometerLabel(call.diagnosis.salesTemperature)}
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

      <section className="bdr-history-detail__block">
        <h4>Gravação</h4>
        {call.recordingUrl ? (
          <audio className="bdr-recording-player" controls preload="none" src={call.recordingUrl} />
        ) : (
          <p>{recordingNote}</p>
        )}
      </section>

      {call.transcript ? (
        <details className="bdr-history-detail__block bdr-history-detail__transcript">
          <summary>Transcrição da ligação</summary>
          <p className="bdr-history-detail__pre">{call.transcript}</p>
        </details>
      ) : null}

      <div className="bdr-history-detail__actions">
        {call.recordingUrl ? (
          <a className="bdr-history-detail__link" href={`${call.recordingUrl}?download=1`}>
            Baixar gravação
          </a>
        ) : null}
        {call.phone ? (
          <a className="bdr-history-detail__link" href={`tel:${call.phone.replace(/\D/g, '')}`}>
            Contato
          </a>
        ) : null}
      </div>
    </aside>
  )
}
