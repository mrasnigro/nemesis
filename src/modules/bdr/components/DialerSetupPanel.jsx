import { useEffect, useState } from 'react'
import { useBdrSession } from '../hooks/useBdrSession.js'
import { bdrRepository } from '../services/bdrRepository.js'
import { parseLeadCsv } from '../services/leadCsv.js'

const PROVIDER_LABELS = {
  falevono: 'FaleVono',
  simulated: 'Simulador (desenvolvimento)',
  none: 'Não configurada',
}

/**
 * Operator extension, telephony status, and the dial queue of the selected campaign (with CSV import).
 */
export default function DialerSetupPanel() {
  const { dialerConfig, setExtension, selectedCampaign, reloadCampaigns, selectCampaign } =
    useBdrSession()
  const [extensionDraft, setExtensionDraft] = useState('')
  const [extensionMessage, setExtensionMessage] = useState('')
  const [summary, setSummary] = useState(null)
  const [importMessage, setImportMessage] = useState('')
  const [importing, setImporting] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')

  useEffect(() => {
    setExtensionDraft(dialerConfig?.extension || '')
  }, [dialerConfig?.extension])

  const campaignId = selectedCampaign?.id
  useEffect(() => {
    if (!campaignId) return undefined
    let cancelled = false
    bdrRepository
      .leadSummary(campaignId)
      .then((next) => {
        if (!cancelled) setSummary(next)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId, importMessage])

  async function saveExtension(event) {
    event.preventDefault()
    const value = extensionDraft.trim()
    if (!value) return
    try {
      await setExtension(value)
      setExtensionMessage('Ramal salvo.')
    } catch (error) {
      setExtensionMessage(error?.message || 'Não foi possível salvar o ramal.')
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !campaignId) return
    setImporting(true)
    setImportMessage('')
    try {
      const { leads, missingPhoneColumn } = parseLeadCsv(await file.text())
      if (missingPhoneColumn) {
        setImportMessage('A planilha precisa de uma coluna "Telefone".')
        return
      }
      if (!leads.length) {
        setImportMessage('Nenhuma linha encontrada na planilha.')
        return
      }
      const result = await bdrRepository.importLeads(campaignId, leads, 'import')
      setImportMessage(
        `${result.inserted} lead(s) adicionados · ${result.duplicates} duplicado(s) · ${result.invalid.length} telefone(s) inválido(s).`,
      )
      await reloadCampaigns()
    } catch (error) {
      setImportMessage(error?.message || 'Falha ao importar.')
    } finally {
      setImporting(false)
    }
  }

  async function createCampaign(event) {
    event.preventDefault()
    const name = newCampaignName.trim()
    if (!name) return
    try {
      const campaign = await bdrRepository.createCampaign({ name, status: 'active' })
      setNewCampaignName('')
      await reloadCampaigns()
      if (campaign?.id) selectCampaign(campaign.id)
    } catch (error) {
      setImportMessage(error?.message || 'Não foi possível criar a campanha.')
    }
  }

  const provider = dialerConfig?.provider || 'none'

  return (
    <section className="bdr-home__panel bdr-setup">
      <header>
        <h2>Telefonia e fila</h2>
        <p>
          Provedor: <strong>{PROVIDER_LABELS[provider] || provider}</strong>
          {dialerConfig && !dialerConfig.configured ? ' — peça ao administrador para configurar.' : ''}
        </p>
      </header>

      <form className="bdr-setup__row" onSubmit={saveExtension}>
        <label htmlFor="bdr-extension">Meu ramal</label>
        <input
          id="bdr-extension"
          className="bdr-setup__input"
          value={extensionDraft}
          onChange={(e) => setExtensionDraft(e.target.value)}
          placeholder="ex.: 1001"
          maxLength={40}
        />
        <button type="submit" className="bdr-setup__button">
          Salvar
        </button>
      </form>
      {extensionMessage ? <p className="bdr-setup__note">{extensionMessage}</p> : null}

      <div className="bdr-setup__queue">
        <h3>Fila — {selectedCampaign?.name || 'nenhuma campanha'}</h3>
        {summary ? (
          <ul className="bdr-setup__stats">
            <li>
              <strong>{summary.ready}</strong> prontos
            </li>
            <li>
              <strong>{summary.scheduled}</strong> aguardando nova tentativa
            </li>
            <li>
              <strong>{summary.done}</strong> concluídos
            </li>
            <li>
              <strong>{summary.exhausted}</strong> sem sucesso
            </li>
          </ul>
        ) : null}
        <label className="bdr-setup__button bdr-setup__file">
          {importing ? 'Importando…' : 'Importar leads (CSV)'}
          <input type="file" accept=".csv,text/csv" onChange={handleFile} disabled={importing || !campaignId} hidden />
        </label>
        <p className="bdr-setup__note">
          Colunas reconhecidas: Telefone (obrigatória), Empresa, Nome, E-mail, CNPJ, Endereço, Cidade, UF, CEP.
        </p>
        {importMessage ? <p className="bdr-setup__note">{importMessage}</p> : null}
      </div>

      <form className="bdr-setup__row" onSubmit={createCampaign}>
        <label htmlFor="bdr-new-campaign">Nova campanha</label>
        <input
          id="bdr-new-campaign"
          className="bdr-setup__input"
          value={newCampaignName}
          onChange={(e) => setNewCampaignName(e.target.value)}
          placeholder="Nome da campanha"
          maxLength={200}
        />
        <button type="submit" className="bdr-setup__button">
          Criar
        </button>
      </form>
    </section>
  )
}
