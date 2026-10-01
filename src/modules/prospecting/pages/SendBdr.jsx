import { Link } from 'react-router-dom'
import { companyDirectory } from '../data/seeds.js'
import { useProspecting } from '../context/ProspectingContext.jsx'

export default function ProspectSendBdrPage() {
  const {
    qualifiedIds,
    sentQueue,
    lastSend,
    sendToBdr,
    canSendBdr,
  } = useProspecting()

  const pending = qualifiedIds
    .map((id) => companyDirectory.find((c) => c.id === id))
    .filter(Boolean)

  function handleSendAll() {
    sendToBdr(qualifiedIds)
  }

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to="/modules/prospecting" className="imp-btn imp-btn--ghost">
          ← Voltar à busca
        </Link>
        <Link to="/modules/bdr" className="imp-btn imp-btn--ghost">
          Abrir discador BDR
        </Link>
      </div>

      {lastSend ? (
        <div className="imp-toast">
          {lastSend.importStatus === 'sent'
            ? `${lastSend.importResult.inserted} contato(s) adicionados à fila da ${lastSend.campaignHint} (${lastSend.importResult.duplicates} já estavam na fila).`
            : lastSend.importStatus === 'failed'
              ? `Falha ao enviar ao discador: ${lastSend.importError}`
              : lastSend.importStatus === 'no_campaign'
                ? 'Selecione uma campanha no painel do discador antes de enviar.'
                : `Enviando ${lastSend.companies.length} contato(s) ao discador…`}
        </div>
      ) : null}

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Fila para BDR</h2>
              <p>Prospects qualificados aguardando envio.</p>
            </div>
            <button
              type="button"
              className="imp-btn imp-btn--primary"
              disabled={!canSendBdr || pending.length === 0}
              onClick={handleSendAll}
            >
              Enviar {pending.length || ''} ao BDR
            </button>
          </div>

          {pending.length === 0 ? (
            <div className="imp-empty">Nenhum prospect na fila. Qualifique empresas na busca.</div>
          ) : (
            <table className="imp-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Contato</th>
                  <th>Telefone</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{company.contact.name}</td>
                    <td>{company.contact.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Envios recentes</h2>
              <p>Histórico desta sessão.</p>
            </div>
          </div>
          {sentQueue.length === 0 ? (
            <div className="imp-empty">Ainda não há envios nesta sessão.</div>
          ) : (
            <div className="imp-list">
              {sentQueue.map((batch) => (
                <div key={batch.id} className="imp-list-item" style={{ cursor: 'default' }}>
                  <div>
                    <h3>{batch.campaignHint}</h3>
                    <p>
                      {batch.companies.length} contato(s) ·{' '}
                      {new Date(batch.sentAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span className="imp-pill imp-pill--green">Enviado</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
